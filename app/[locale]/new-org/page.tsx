"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ChangeEvent } from 'react';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import { useTranslations } from 'next-intl';
import { isValidImageFile, getInvalidFileFormatMessage } from '@/lib/file-validation';
import { isAdminEmail } from '@/lib/admin-config';

export default function NewOrg() {
  const t = useTranslations();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasOrg, setHasOrg] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [logo, setLogo] = useState<{ file: File; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [city, setCity] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [reachOutEmail, setReachOutEmail] = useState('');

  useEffect(() => {
    async function checkAuthAndOrg() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      const email = user.email || '';
      const admin = isAdminEmail(email);
      setIsAdmin(admin);
      // Check if user already has an organization
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner', user.id);
      if (error) {
        alert(t('organizations.errorCheckingOrganizations') + ': ' + error.message);
        setHasOrg(false);
        setCheckingAuth(false);
        return;
      }
      if (!admin && data && data.length > 0) {
        setHasOrg(true);
        router.replace('/dashboard');
        return;
      }
      setHasOrg(false);
      setCheckingAuth(false);
    }
    checkAuthAndOrg();
  }, [router]);

  if (checkingAuth || hasOrg) return null;

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
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
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
    e.target.value = '';
  }

  function handleRemovePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!isValidImageFile(file)) {
      alert(getInvalidFileFormatMessage(t));
      e.target.value = '';
      return;
    }
    
    setLogo({ file, preview: URL.createObjectURL(file) });
    e.target.value = '';
  }

  function handleRemoveLogo() {
    setLogo(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length === 0) {
      alert(t('organizations.uploadAtLeastOnePhoto'));
      return;
    }
    setUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploading(false);
      return alert(t('organizations.pleaseLogInFirst'));
    }

    // Upload photos
    const photoData: { url: string }[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const fileExt = photo.file.name.split('.').pop();
      const filePath = `org-photos/${user.id}/${Date.now()}_${i}.${fileExt}`;
      const { error } = await supabase.storage
        .from('organization-photos')
        .upload(filePath, photo.file, { upsert: false });
      if (error) {
        setUploading(false);
        alert(`Failed to upload photo: ${error.message}`);
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from('organization-photos')
        .getPublicUrl(filePath);
      photoData.push({ url: publicUrlData.publicUrl });
    }

    // Upload logo (optional)
    let logoUrl: string | null = null;
    if (logo) {
      const fileExt = logo.file.name.split('.').pop();
      const filePath = `org-logos/${user.id}/${Date.now()}_logo.${fileExt}`;
      const { error } = await supabase.storage
        .from('organization-photos')
        .upload(filePath, logo.file, { upsert: false });
      if (error) {
        setUploading(false);
        alert(`Failed to upload logo: ${error.message}`);
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from('organization-photos')
        .getPublicUrl(filePath);
      logoUrl = publicUrlData.publicUrl;
    }

    let newOrg: any = null;
    let error: any = null;

    if (isAdmin) {
      // For admin, either ownerEmail or reachOutEmail must be provided
      if (!ownerEmail && !reachOutEmail) {
        setUploading(false);
        alert('Please enter either an owner email or reach out email');
        return;
      }
      try {
        const response = await fetch('/api/admin/create-organization', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-requester-email': user.email || '',
          },
          body: JSON.stringify({
            name,
            description: desc,
            city,
            contactEmail,
            ownerEmail,
            reachOutEmail,
            photos: photoData,
            logo: logoUrl,
          }),
        });
        if (!response.ok) {
          const err = await response.json();
          error = new Error(err.error || 'Failed to create organization');
        } else {
          const payload = await response.json();
          newOrg = payload.organization;
          // Store whether verification emails should be sent
          newOrg._shouldSendVerificationEmails = payload.shouldSendVerificationEmails;
        }
      } catch (e: any) {
        error = e;
      }
    } else {
      const insertRes = await supabase.from('organizations').insert({
        name,
        description: desc,
        owner: user.id,
        photos: photoData,
        logo: logoUrl,
        city,
        contact_email: contactEmail,
        verification_status: 'pending',
        verification_token: (crypto.randomUUID && crypto.randomUUID()) || `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }).select().single();
      newOrg = insertRes.data;
      error = insertRes.error;
    }

    if (error) {
      console.error('Organization creation: Failed to insert organization:', error);
      setUploading(false);
      return alert(error.message);
    }

    console.log('Organization creation: Organization inserted successfully:', newOrg);

    if (newOrg) {
      // Only send verification emails if there's an owner (not for admin-managed orgs)
      if (newOrg._shouldSendVerificationEmails !== false) {
        try {
          // Send verification emails via API endpoint
          console.log('Organization creation: Sending verification emails for org:', newOrg.id);
          const response = await fetch('/api/send-organization-verification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ organizationId: newOrg.id }),
          });

          console.log('Organization creation: Email API response status:', response.status);
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Organization creation: Failed to send verification emails:', errorData);
            alert('Organization created successfully, but there was an issue sending verification emails. Please contact support.');
          } else {
            const successData = await response.json();
            console.log('Organization creation: Verification emails sent successfully:', successData);
            alert('Organization created successfully! Verification emails have been sent.');
          }
        } catch (emailError) {
          console.error('Organization creation: Error sending verification emails:', emailError);
          alert('Organization created successfully, but there was an issue sending verification emails. Please contact support.');
        }
      } else {
        // Admin-managed organization - no verification emails needed
        console.log('Organization creation: Admin-managed organization created, no verification emails needed');
        alert('Admin-managed organization created successfully! No verification emails sent.');
      }
    } else {
      console.error('Organization creation: No organization data available for email sending');
    }

    setUploading(false);
    // Redirect to a pending confirmation page or dashboard with a message
    router.push('/dashboard?orgPending=true');
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
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
  }

  // Drag-and-drop handlers for logo
  function handleLogoDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setLogoDragActive(true);
  }
  function handleLogoDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setLogoDragActive(false);
  }
  function handleLogoDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setLogoDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setLogo({ file, preview: URL.createObjectURL(file) });
  }

  return (
    <main className="max-w-4xl mx-auto p-6 sm:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-voluna-primary mb-2">{t('organizations.createNewOrganization')}</h1>
        <p className="text-gray-600">{t('organizations.setupOrganizationDescription')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('profile.basicInformation')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('organizations.organizationName')}</label>
              <input
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder={t('organizations.enterOrganizationName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {isAdmin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email (admin only)</label>
                  <input
                    type="email"
                    className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter owner's email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reach Out Email (for daily digest)</label>
                  <input
                    type="email"
                    className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter email for daily volunteer sign-up digest"
                    value={reachOutEmail}
                    onChange={(e) => setReachOutEmail(e.target.value)}
                  />
                  <p className="text-sm text-gray-500 mt-1">This email will receive daily notifications of volunteer sign-ups</p>
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.location')}</label>
              <GooglePlacesAutocomplete
                value={city}
                onChange={setCity}
                placeholder={t('organizations.enterOrganizationCity')}
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('organizations.contactEmail')}</label>
              <input
                type="email"
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder={t('organizations.enterContactEmail')}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
              />
              <p className="text-sm text-gray-500 mt-1">{t('organizations.emailUsageNote')}</p>
              <p className="text-sm text-gray-500 mt-1">{t('organizations.emailPublicNotice')}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.description')}</label>
              <textarea
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder={t('organizations.tellUsAboutOrganization')}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>
        </div>

        {/* Organization Photos */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('organizations.organizationPhotos')}</h3>
          <p className="text-gray-600 mb-4">{t('organizations.addPhotosDescription')}</p>
          
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('org-photo-input')?.click()}
          >
            <input
              id="org-photo-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              disabled={photos.length >= 5 || uploading}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center">
              <span className="text-3xl mb-2">📷</span>
              <span className="text-sm text-gray-600 font-medium">{t('organizations.dragDropOrClickPhotos')}</span>
              <span className="text-xs text-gray-500 mt-1">{t('organizations.upTo5Images')}</span>
            </div>
          </div>
          
          {photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative border border-gray-200 rounded-lg p-3">
                  <img
                    src={photo.preview}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                    onClick={() => handleRemovePhoto(idx)}
                    aria-label={t('organizations.removePhoto')}
                    disabled={uploading}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Organization Logo */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('organizations.organizationLogo')}</h3>
          <p className="text-gray-600 mb-4">{t('organizations.addLogoDescription')}</p>
          
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              logoDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleLogoDragOver}
            onDragLeave={handleLogoDragLeave}
            onDrop={handleLogoDrop}
            onClick={() => !logo && document.getElementById('org-logo-input')?.click()}
          >
            <input
              id="org-logo-input"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={!!logo || uploading}
              className="hidden"
            />
            {!logo ? (
              <div className="flex flex-col items-center justify-center">
                <span className="text-3xl mb-2">🖼️</span>
                <span className="text-sm text-gray-600 font-medium">{t('organizations.dragDropOrClickLogo')}</span>
                <span className="text-xs text-gray-500 mt-1">{t('organizations.oneImageOnly')}</span>
              </div>
            ) : (
              <div className="relative border border-gray-200 rounded-lg p-3 w-32 mx-auto">
                <img
                  src={logo.preview}
                  alt="Logo preview"
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                  onClick={handleRemoveLogo}
                  aria-label={t('organizations.removeLogo')}
                  disabled={uploading}
                >
                  ×
                </button>
              </div>
            )}
          </div>
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
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50" 
            disabled={uploading}
          >
            {uploading ? t('organizations.creating') : t('organizations.createOrganization')}
          </button>
        </div>
      </form>
    </main>
  );
} 