"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { supabase } from "@/lib/supabase";
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import OrgProtectedRoute from '@/components/org-protected-route';
import { isValidImageFile, getInvalidFileFormatMessage } from '@/lib/file-validation';

export default function EditOpportunity() {
  const { orgId, id } = useParams() as { orgId: string; id: string };
  
  return (
    <OrgProtectedRoute orgId={orgId}>
      <EditOpportunityContent />
    </OrgProtectedRoute>
  );
}

function EditOpportunityContent() {
  const { orgId, id } = useParams() as { orgId: string; id: string };
  const router = useRouter();
  const t = useTranslations();
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    date: "",
    startTime: "",
    endTime: "",
    needed: 1,
    cause_tags: [] as string[],
    skills_needed: [] as string[],
    is_remote: false,
    duration_hours: 2,
    frequency: 'one-off',
    age_group: 'all',
    difficulty_level: 'beginner'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [location, setLocation] = useState('');

  // Photo handling
  const [photos, setPhotos] = useState<{ file: File; preview: string; description: string }[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<{ url: string; description: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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

  const [startParts, setStartParts] = useState({ hour: 12, minute: '00', ampm: 'AM' });
  const [endParts, setEndParts] = useState({ hour: 12, minute: '00', ampm: 'AM' });

  useEffect(() => {
    setStartParts(from24Hour(form.startTime));
  }, [form.startTime]);

  useEffect(() => {
    setEndParts(from24Hour(form.endTime));
  }, [form.endTime]);

  // Photo handling functions
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
    
    const newPhotos = Array.from(files).slice(0, 5 - photos.length - existingPhotos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      description: '',
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5 - existingPhotos.length));
    e.target.value = '';
  }

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
    const newPhotos = Array.from(files).slice(0, 5 - photos.length - existingPhotos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      description: '',
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5 - existingPhotos.length));
  }

  function handlePhotoDescriptionChange(idx: number, desc: string) {
    setPhotos((prev) => prev.map((p, i) => (i === idx ? { ...p, description: desc } : p)));
  }

  function handleRemovePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleRemoveExistingPhoto(idx: number) {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: opp, error: oppError } = await supabase
        .from("opportunities")
        .select("*, organizations(owner)")
        .eq("id", id)
        .single();
      
      if (oppError || !opp) {
        setError("Opportunity not found.");
        setLoading(false);
        return;
      }

      // Parse the date and time from the stored datetime
      const startDate = new Date(opp.start_time);
      const endDate = new Date(opp.end_time);
      
      setForm({
        title: opp.title ?? "",
        description: opp.description ?? "",
        location: opp.location ?? "",
        date: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endTime: endDate.toTimeString().slice(0, 5),
        needed: opp.needed ?? 1,
        cause_tags: opp.cause_tags ?? [],
        skills_needed: opp.skills_needed ?? [],
        is_remote: opp.is_remote ?? false,
        duration_hours: opp.duration_hours ?? 2,
        frequency: opp.frequency ?? 'one-off',
        age_group: opp.age_group ?? 'all',
        difficulty_level: opp.difficulty_level ?? 'beginner'
      });

      setLocation(opp.location ?? '');
      setExistingPhotos(opp.photos ?? []);

      // Ownership is already verified by OrgProtectedRoute
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    // Validate date and time
    if (!form.date || !form.startTime || !form.endTime) {
      alert('Please select a date and both start and end times.');
      return;
    }
    
    // Create dates in local timezone and convert to UTC for storage
    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);
    
    if (end <= start) {
      alert('End time must be after start time.');
      return;
    }

    setUploading(true);

    // Upload new photos to Supabase Storage
    const photoData: { url: string; description: string }[] = [];
    
    // Keep existing photos
    photoData.push(...existingPhotos);
    
    // Upload new photos
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

    const { error } = await supabase
      .from("opportunities")
      .update({
        title: form.title,
        description: form.description,
        location: location,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        needed: form.needed,
        cause_tags: form.cause_tags,
        skills_needed: form.skills_needed,
        is_remote: form.is_remote,
        duration_hours: form.duration_hours,
        frequency: form.frequency,
        age_group: form.age_group,
        difficulty_level: form.difficulty_level,
        photos: photoData
      })
      .eq("id", id);
    
    setUploading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/dashboard/${orgId}`);
  }

  if (loading) return <p className="p-8">{t('common.loading')}</p>;
  if (error) return <p className="p-8 text-red-600">{error}</p>;

  return (
    <main className="max-w-4xl mx-auto p-6 sm:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-green-700 mb-2">{t('opportunity.editOpportunity')}</h1>
        <p className="text-gray-600">{t('opportunity.updateOpportunityDetails')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('opportunity.basicInformation')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.opportunityTitle')}</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Volunteers Needed</label>
            <input
              className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              type="number"
              min={1}
              placeholder="How many volunteers do you need?"
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
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Opportunity Details</h3>
          
          {/* Cause Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Cause Categories</label>
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
                  <span className="text-sm text-gray-700 capitalize">{tag}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Skills Needed */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Skills Needed</label>
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
                  <span className="text-sm text-gray-700">{skill.replace('_', ' ')}</span>
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
              <span className="text-sm font-medium text-gray-700">{t('opportunity.remoteOpportunity')}</span>
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
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('opportunity.photos')}</h3>
          <p className="text-gray-600 mb-4">{t('opportunity.managePhotos')}</p>
          
          {/* Existing Photos */}
          {existingPhotos.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-800 mb-3">{t('opportunity.currentPhotos')}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {existingPhotos.map((photo, idx) => (
                  <div key={idx} className="relative border border-gray-200 rounded-lg p-3">
                    <img
                      src={photo.url}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                    <p className="text-sm text-gray-600 mb-2">{photo.description || t('opportunity.noDescription')}</p>
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                      onClick={() => handleRemoveExistingPhoto(idx)}
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* New Photos Upload */}
          {photos.length + existingPhotos.length < 5 && (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
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
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center">
                <span className="text-3xl mb-2">📷</span>
                <span className="text-sm text-gray-600 font-medium">{t('opportunity.dragDropPhotos')}</span>
                <span className="text-xs text-gray-500 mt-1">({t('opportunity.moreAllowed', { count: 5 - photos.length - existingPhotos.length })})</span>
              </div>
            </div>
          )}
          
          {/* New Photos Preview */}
          {photos.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-800 mb-3">{t('opportunity.newPhotos')}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/${orgId}`)}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            disabled={uploading}
          >
            {uploading ? t('opportunity.saving') : t('opportunity.saveChanges')}
          </button>
        </div>
      </form>
    </main>
  );
} 