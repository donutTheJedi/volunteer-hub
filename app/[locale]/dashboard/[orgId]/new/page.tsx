// app/dashboard/[orgId]/new/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import { useTranslations } from 'next-intl';
import OrgProtectedRoute from '@/components/org-protected-route';
import { useAuth } from '@/lib/auth-context';
import { isValidImageFile, getInvalidFileFormatMessage } from '@/lib/file-validation';
import { useFormPersistence, clearFormData } from '@/lib/useFormPersistence';
import { isAdminEmail } from '@/lib/admin-config';

// Add this at the top or in a declarations file if needed:
// declare module 'react-mapbox-autocomplete';

export default function NewOpp() {
  const { orgId } = useParams() as { orgId: string };
  
  return (
    <OrgProtectedRoute orgId={orgId}>
      <NewOppContent />
    </OrgProtectedRoute>
  );
}

type OpportunityForm = {
  title: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  needed: number;
  cause_tags: string[];
  skills_needed: string[];
  is_remote: boolean;
  duration_hours: number;
  frequency: string;
  age_group: string;
  difficulty_level: string;
};

function NewOppContent() {
  const t = useTranslations();
  const { orgId } = useParams() as { orgId: string };
  const router = useRouter();
  const { user } = useAuth();

  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkVerification() {
      setLoading(true);
      
      // Check if user is admin
      const email = user?.email || '';
      const admin = isAdminEmail(email);
      setIsAdmin(admin);
      
      const { data: org, error } = await supabase
        .from('organizations')
        .select('verification_status, reach_out_email')
        .eq('id', orgId)
        .single();
      if (error || !org) {
        setVerificationStatus(null);
      } else {
        setVerificationStatus(org.verification_status);
        // If admin and org has reach_out_email, allow access regardless of verification status
        if (admin && org.reach_out_email) {
          setVerificationStatus('approved');
        }
      }
      setLoading(false);
    }
    checkVerification();
  }, [orgId, user]);

  // Use form persistence to save data when user navigates away
  const [form, setForm] = useFormPersistence<OpportunityForm>(`opportunity-form-${orgId}`, {
    title: '',
    description: '',
    location: '',
    date: '', // new: only one day
    startTime: '', // new: start hour
    endTime: '', // new: end hour
    needed: 1,
    cause_tags: [] as string[],
    skills_needed: [] as string[],
    is_remote: false,
    duration_hours: 2,
    frequency: 'one-off',
    age_group: 'all',
    difficulty_level: 'beginner'
  });

  const [photos, setPhotos] = useState<{ file: File; preview: string; description: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  // Drag-and-drop photo upload state
  const [dragActive, setDragActive] = useState(false);

  const [location, setLocation] = useState('');

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    
    // Validate file types
    const invalidFiles = Array.from(files).filter(file => !isValidImageFile(file));
    if (invalidFiles.length > 0) {
      alert(getInvalidFileFormatMessage(t));
      e.target.value = '';
      return;
    }
    
    const newPhotos = Array.from(files).slice(0, 5 - photos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      description: '',
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
    e.target.value = '';
  }

  // Drag-and-drop handlers
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
  }
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (!files) return;
    const newPhotos = Array.from(files).slice(0, 5 - photos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      description: '',
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
  }

  function handlePhotoDescriptionChange(idx: number, desc: string) {
    setPhotos((prev) => prev.map((p, i) => (i === idx ? { ...p, description: desc } : p)));
  }

  function handleRemovePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Validate date and time
    if (!form.date || !form.startTime || !form.endTime) {
      alert(t('opportunity.pleaseSelectDateAndTimes'));
      return;
    }
    
    // Validate photos are required
    if (photos.length === 0) {
      alert(t('opportunity.uploadAtLeastOnePhoto'));
      return;
    }
    
    // Create dates in local timezone and convert to UTC for storage
    // This ensures the local time you select is preserved when stored as UTC
    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);
    
    // Debug: Log the time conversion
    console.log('Selected date:', form.date);
    console.log('Selected start time:', form.startTime);
    console.log('Selected end time:', form.endTime);
    console.log('Start date object:', start);
    console.log('End date object:', end);
    console.log('Start ISO string:', start.toISOString());
    console.log('End ISO string:', end.toISOString());
    
    if (end <= start) {
      alert('End time must be after start time.');
      return;
    }
    setUploading(true);

    // 🔍 1. grab session and show the UID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log('session UID          →', user?.id);

    // 🔍 2. show the orgId param
    console.log('orgId param           →', orgId);

    // 🔍 3. upload photos to Supabase Storage
    const photoData: { url: string; description: string }[] = [];
    if (photos.length > 0) {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fileExt = photo.file.name.split('.').pop();
        const filePath = `${orgId}/${Date.now()}_${i}.${fileExt}`;
        const { error } = await supabase.storage
          .from('opportunity-photos')
          .upload(filePath, photo.file, { upsert: false });
        if (error) {
          setUploading(false);
          alert(`Failed to upload photo: ${error.message}`);
          return;
        }
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('opportunity-photos')
          .getPublicUrl(filePath);
        photoData.push({ url: publicUrlData.publicUrl, description: photo.description });
      }
    }

    // 🔍 4. show payload
    const payload = {
      org_id: orgId,
      title: form.title,
      description: form.description,
      location: location, // Use the selected location
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      needed: form.needed,
      photos: photoData,
      cause_tags: form.cause_tags,
      skills_needed: form.skills_needed,
      is_remote: form.is_remote,
      duration_hours: form.duration_hours,
      frequency: form.frequency,
      age_group: form.age_group,
      difficulty_level: form.difficulty_level
    };
    console.table(payload);

    // 🔍 5. run the insert
    if (isAdmin) {
      // Use admin API for admin-managed organizations
      // Convert payload to match admin API expected format
      const adminPayload = {
        orgId: payload.org_id,
        title: payload.title,
        description: payload.description,
        location: payload.location,
        startTime: payload.start_time,
        endTime: payload.end_time,
        needed: payload.needed,
        photos: payload.photos,
        causeTags: payload.cause_tags,
        skillsNeeded: payload.skills_needed,
        isRemote: payload.is_remote,
        durationHours: payload.duration_hours,
        frequency: payload.frequency,
        ageGroup: payload.age_group,
        difficultyLevel: payload.difficulty_level
      };
      
      try {
        const response = await fetch('/api/admin/create-opportunity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-requester-email': user?.email || '',
          },
          body: JSON.stringify(adminPayload),
        });

        const result = await response.json();
        
        setUploading(false);
        if (!response.ok) {
          console.error('Admin API error', result);
          alert(result.error || 'Failed to create opportunity');
          return;
        }
        
        console.log('Opportunity created via admin API:', result);
        // Clear the form data from localStorage on successful submission
        clearFormData(`opportunity-form-${orgId}`);
        router.replace(`/dashboard/${orgId}`);
      } catch (error) {
        setUploading(false);
        console.error('Admin API request error', error);
        alert('Failed to create opportunity');
        return;
      }
    } else {
      // Use direct Supabase insert for regular organizations
      const { error } = await supabase.from('opportunities').insert(payload);

      setUploading(false);
      if (error) {
        console.error('Supabase error', error);
        alert(JSON.stringify(error, null, 2));   // full error object
        return;
      }
      // Clear the form data from localStorage on successful submission
      clearFormData(`opportunity-form-${orgId}`);
      router.replace(`/dashboard/${orgId}`);
    }
  }

  const validMinutes = [0, 15, 30, 45];
  function roundToNearest15(timeStr: string) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const rounded = validMinutes.reduce((prev, curr) => Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev, 0);
    return `${h.toString().padStart(2, '0')}:${rounded.toString().padStart(2, '0')}`;
  }
  const [timeWarning, setTimeWarning] = useState('');

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = ['00', '15', '30', '45'];
  const ampm = ['AM', 'PM'];
  function to24Hour(hour: number, ampm: string) {
    if (ampm === 'AM') return hour === 12 ? 0 : hour;
    return hour === 12 ? 12 : hour + 12;
  }
  function from24Hour(hhmm: string) {
    if (!hhmm) return { hour: 12, minute: '00', ampm: 'AM' };
    const [h, m] = hhmm.split(':').map(Number);
    const ampmVal = h >= 12 ? 'PM' : 'AM';
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour: hour12, minute: m.toString().padStart(2, '0'), ampm: ampmVal };
  }
  const [startParts, setStartParts] = useState(from24Hour(form.startTime));
  const [endParts, setEndParts] = useState(from24Hour(form.endTime));

  return (
    <main className="max-w-4xl mx-auto p-6 sm:p-10">
      {/* Block creation if org is not approved */}
      {!loading && verificationStatus !== 'approved' && (
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800">{t('organizations.verificationPending')}</h2>
          <p className="text-yellow-800 text-sm">{t('organizations.verificationPendingMessage')}</p>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-green-700 mb-2">{t('opportunity.createNewOpportunity')}</h1>
        <p className="text-gray-600">{t('opportunity.shareOpportunityWithCommunity')}</p>
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Your form data is automatically saved as you type
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('profile.basicInformation')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.title')}</label>
              <input
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder={t('opportunity.titlePlaceholder')}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.description')}</label>
              <textarea
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder={t('opportunity.descriptionPlaceholder')}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.location')}</label>
              <GooglePlacesAutocomplete
                value={location}
                onChange={setLocation}
                placeholder={t('opportunity.enterLocation')}
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Date and Time */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('opportunity.dateAndTime')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.date')}</label>
              <input
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.startTime')}</label>
              <div className="flex items-center gap-0 border border-gray-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-green-500">
                <select className="appearance-none px-3 py-3 border-0 focus:ring-0 focus:outline-none text-gray-900 bg-transparent" value={startParts.hour} onChange={e => {
                  const hour = Number(e.target.value);
                  setStartParts(parts => { const np = { ...parts, hour }; setForm(f => ({ ...f, startTime: `${to24Hour(hour, parts.ampm).toString().padStart(2, '0')}:${parts.minute}` })); return np; });
                }}>{hours.map(h => <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>)}</select>
                <span className="font-bold text-gray-500 select-none">:</span>
                <select className="appearance-none px-3 py-3 border-0 focus:ring-0 focus:outline-none text-gray-900 bg-transparent" value={startParts.minute} onChange={e => {
                  const minute = e.target.value;
                  setStartParts(parts => { const np = { ...parts, minute }; setForm(f => ({ ...f, startTime: `${to24Hour(parts.hour, parts.ampm).toString().padStart(2, '0')}:${minute}` })); return np; });
                }}>{minutes.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <select className="appearance-none px-3 py-3 border-0 focus:ring-0 focus:outline-none text-gray-900 bg-transparent" value={startParts.ampm} onChange={e => {
                  const ampmVal = e.target.value;
                  setStartParts(parts => { const np = { ...parts, ampm: ampmVal }; setForm(f => ({ ...f, startTime: `${to24Hour(parts.hour, ampmVal).toString().padStart(2, '0')}:${parts.minute}` })); return np; });
                }}>{ampm.map(a => <option key={a} value={a}>{a}</option>)}</select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.endTime')}</label>
              <div className="flex items-center gap-0 border border-gray-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-green-500">
                <select className="appearance-none px-3 py-3 border-0 focus:ring-0 focus:outline-none text-gray-900 bg-transparent" value={endParts.hour} onChange={e => {
                  const hour = Number(e.target.value);
                  setEndParts(parts => { const np = { ...parts, hour }; setForm(f => ({ ...f, endTime: `${to24Hour(hour, parts.ampm).toString().padStart(2, '0')}:${parts.minute}` })); return np; });
                }}>{hours.map(h => <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>)}</select>
                <span className="font-bold text-gray-500 select-none">:</span>
                <select className="appearance-none px-3 py-3 border-0 focus:ring-0 focus:outline-none text-gray-900 bg-transparent" value={endParts.minute} onChange={e => {
                  const minute = e.target.value;
                  setEndParts(parts => { const np = { ...parts, minute }; setForm(f => ({ ...f, endTime: `${to24Hour(parts.hour, parts.ampm).toString().padStart(2, '0')}:${minute}` })); return np; });
                }}>{minutes.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <select className="appearance-none px-3 py-3 border-0 focus:ring-0 focus:outline-none text-gray-900 bg-transparent" value={endParts.ampm} onChange={e => {
                  const ampmVal = e.target.value;
                  setEndParts(parts => { const np = { ...parts, ampm: ampmVal }; setForm(f => ({ ...f, endTime: `${to24Hour(parts.hour, ampmVal).toString().padStart(2, '0')}:${parts.minute}` })); return np; });
                }}>{ampm.map(a => <option key={a} value={a}>{a}</option>)}</select>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.needed')}</label>
            <input
              className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              type="number"
              min={1}
              placeholder={t('opportunity.howManyVolunteersNeeded')}
              value={form.needed}
              onChange={(e) =>
                setForm({ ...form, needed: Number(e.target.value) })
              }
              required
            />
          </div>
        </div>

        {/* Opportunity Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('opportunity.opportunityDetails')}</h3>
          
          {/* Cause Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">{t('opportunity.causeTags')}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {['animals', 'environment', 'tech', 'elderly', 'art', 'education', 'health', 'homelessness', 'hunger', 'children', 'disabilities', 'community', 'sports', 'music', 'literacy', 'conservation'].map(tag => (
                <label key={tag} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.cause_tags.includes(tag)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm(prev => ({ ...prev, cause_tags: [...prev.cause_tags, tag] }));
                      } else {
                        setForm(prev => ({ ...prev, cause_tags: prev.cause_tags.filter(t => t !== tag) }));
                      }
                    }}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{t(`causes.${tag}`)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Skills Needed */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">{t('opportunity.skillsNeeded')}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {['publicSpeaking', 'socialMedia', 'coding', 'organizing', 'teaching', 'cooking', 'driving', 'photography', 'writing', 'translation', 'medical', 'construction', 'gardening', 'mentoring', 'fundraising'].map(skill => (
                <label key={skill} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.skills_needed.includes(skill)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm(prev => ({ ...prev, skills_needed: [...prev.skills_needed, skill] }));
                      } else {
                        setForm(prev => ({ ...prev, skills_needed: prev.skills_needed.filter(s => s !== skill) }));
                      }
                    }}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">{t(`skills.${skill.replace('_', '')}`)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Remote Option */}
          <div className="mb-6">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={form.is_remote}
                onChange={(e) => setForm({ ...form, is_remote: e.target.checked })}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">{t('opportunity.isRemote')}</span>
            </label>
          </div>

          {/* Duration and Frequency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.durationHours')}</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={form.duration_hours}
                onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })}
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.frequency')}</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="one-off">{t('opportunities.oneOff')}</option>
                <option value="weekly">{t('opportunities.weekly')}</option>
                <option value="monthly">{t('opportunities.monthly')}</option>
                <option value="ongoing">{t('opportunities.ongoing')}</option>
              </select>
            </div>
          </div>

          {/* Age Group and Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.ageGroup')}</label>
              <select
                value={form.age_group}
                onChange={(e) => setForm({ ...form, age_group: e.target.value })}
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">{t('ageGroups.all')}</option>
                <option value="youth">{t('opportunity.youthUnder18')}</option>
                <option value="adult">{t('opportunity.adults18Plus')}</option>
                <option value="senior">{t('opportunity.seniors65Plus')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.difficultyLevel')}</label>
              <select
                value={form.difficulty_level}
                onChange={(e) => setForm({ ...form, difficulty_level: e.target.value })}
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="beginner">{t('difficultyLevels.beginner')}</option>
                <option value="intermediate">{t('difficultyLevels.intermediate')}</option>
                <option value="advanced">{t('difficultyLevels.advanced')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Photo upload section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {t('opportunity.photos')} <span className="text-red-500">*</span>
          </h3>
          <p className="text-gray-600 mb-4">{t('opportunity.addPhotosToShowcase')}</p>
          
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragActive ? 'border-green-500 bg-green-50' : photos.length === 0 ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('photo-input')?.click()}
          >
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              disabled={photos.length >= 5}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center">
              <span className="text-3xl mb-2">📷</span>
              <span className="text-sm text-gray-600 font-medium">{t('organizations.dragDropOrClickPhotos')}</span>
              <span className="text-xs text-gray-500 mt-1">{t('organizations.upTo5Images')}</span>
              {photos.length === 0 && (
                <span className="text-xs text-red-500 mt-2 font-medium">At least one photo is required</span>
              )}
            </div>
          </div>
          
          {photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative border border-gray-200 rounded-lg p-3">
                  <img
                    src={photo.preview}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                  <textarea
                    className="border border-gray-300 p-2 w-full text-sm rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder={t('opportunity.descriptionOptional')}
                    value={photo.description}
                    onChange={(e) => handlePhotoDescriptionChange(idx, e.target.value)}
                    rows={2}
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                    onClick={() => handleRemovePhoto(idx)}
                    aria-label={t('organizations.removePhoto')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            disabled={uploading || verificationStatus !== 'approved'}
          >
            {uploading ? t('opportunity.publishing') : t('opportunity.publishOpportunity')}
          </button>
        </div>
      </form>
    </main>
  );
}
