"use client";
import { useEffect, useState, ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTranslations } from "next-intl";
import OrgProtectedRoute from '@/components/org-protected-route';
import { isValidImageFile, getInvalidFileFormatMessage } from '@/lib/file-validation';
import { isAdminEmail } from '@/lib/admin-config';

export default function EditOrg() {
  const { orgId } = useParams() as { orgId: string };
  
  return (
    <OrgProtectedRoute orgId={orgId}>
      <EditOrgContent />
    </OrgProtectedRoute>
  );
}

function EditOrgContent() {
  const t = useTranslations();
  const { orgId } = useParams() as { orgId: string };
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<{ url: string; preview: string; isNew: boolean; file?: File }[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [newLogo, setNewLogo] = useState<{ file: File; preview: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentOwner, setCurrentOwner] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, email: string, name?: string}>>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState<string>("");
  const [newOwnerEmail, setNewOwnerEmail] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const [org, setOrg] = useState<any>(null);

  useEffect(() => {
    async function load() {
      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || '';
      const adminStatus = isAdminEmail(email);
      setIsAdmin(adminStatus);

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("name, description, owner, contact_email, photos, logo, pending_owner_email")
        .eq("id", orgId)
        .single();
      if (orgError || !org) {
        setError(t('organizations.organizationNotFound'));
        setLoading(false);
        return;
      }
      setName(org.name);
      setDesc(org.description ?? "");
      setContactEmail(org.contact_email ?? "");
      setCurrentOwner(org.owner);
      setOrg(org);
      const existingPhotos = Array.isArray(org.photos) ? org.photos as { url: string }[] : [];
      setPhotos(existingPhotos.map(p => ({ url: p.url, preview: p.url, isNew: false })));
      setLogoUrl(org.logo || null);

      // Load available users if admin
      if (adminStatus) {
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const response = await fetch('/api/admin/get-users', {
            headers: {
              'x-requester-email': currentUser?.email || ''
            }
          });
          if (response.ok) {
            const userData = await response.json();
            setAvailableUsers(userData.users || []);
          }
        } catch (err) {
          console.error('Failed to load users:', err);
        }
      }

      setLoading(false);
    }
    load();
  }, [orgId, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    // Upload any new photos
    const uploadedPhotoUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (p.isNew && p.file) {
        const ext = p.file.name.split('.').pop();
        const filePath = `org-photos/${orgId}/${Date.now()}_${i}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('organization-photos')
          .upload(filePath, p.file, { upsert: false });
        if (uploadErr) {
          setSaving(false);
          setError(`Failed to upload photo: ${uploadErr.message}`);
          return;
        }
        const { data: publicUrlData } = supabase.storage
          .from('organization-photos')
          .getPublicUrl(filePath);
        uploadedPhotoUrls.push(publicUrlData.publicUrl);
      } else if (!p.isNew) {
        uploadedPhotoUrls.push(p.url);
      }
    }

    // Handle logo: keep existing, remove, or upload new
    let finalLogoUrl: string | null = logoUrl;
    if (newLogo) {
      const ext = newLogo.file.name.split('.').pop();
      const filePath = `org-logos/${orgId}/${Date.now()}_logo.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('organization-photos')
        .upload(filePath, newLogo.file, { upsert: false });
      if (uploadErr) {
        setSaving(false);
        setError(`Failed to upload logo: ${uploadErr.message}`);
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from('organization-photos')
        .getPublicUrl(filePath);
      finalLogoUrl = publicUrlData.publicUrl;
    }

    const { error: updateErr } = await supabase
      .from("organizations")
      .update({ 
        name, 
        description: desc, 
        contact_email: contactEmail,
        photos: uploadedPhotoUrls.map((url) => ({ url })),
        logo: finalLogoUrl,
      })
      .eq("id", orgId);

    setSaving(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    router.push(`/dashboard/${orgId}`);
  }

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
    
    const remainingSlots = Math.max(0, 5 - photos.length);
    const toAdd = Array.from(files).slice(0, remainingSlots).map((file) => ({
      url: '',
      preview: URL.createObjectURL(file),
      isNew: true,
      file,
    }));
    setPhotos((prev) => [...prev, ...toAdd]);
    e.target.value = '';
  }

  function handleRemovePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleLogoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!isValidImageFile(file)) {
      alert(getInvalidFileFormatMessage(t));
      e.target.value = '';
      return;
    }
    
    setNewLogo({ file, preview: URL.createObjectURL(file) });
    e.target.value = '';
  }

  function handleRemoveLogo() {
    setNewLogo(null);
    setLogoUrl(null);
  }

  async function handleTransferOwnership() {
    const targetEmail = newOwnerEmail.trim();
    const targetUserId = newOwnerId;
    
    if (!targetEmail && !targetUserId) {
      alert('Please enter an email address or select an existing user.');
      return;
    }

    if (targetUserId && targetUserId === currentOwner) {
      alert('Please select a different user to transfer ownership to.');
      return;
    }

    if (!confirm(`Are you sure you want to transfer ownership of this organization? This action cannot be undone.`)) {
      return;
    }

    setTransferring(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      let response;
      if (targetEmail) {
        // Transfer to email (may not exist yet)
        response = await fetch(`/api/admin/transfer-ownership`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-requester-email': currentUser?.email || ''
          },
          body: JSON.stringify({
            orgId,
            newOwnerEmail: targetEmail
          })
        });
      } else {
        // Transfer to existing user ID
        response = await fetch(`/api/admin/transfer-ownership?orgId=${orgId}&newOwnerId=${targetUserId}`, {
          method: 'POST',
          headers: {
            'x-requester-email': currentUser?.email || ''
          }
        });
      }

      const result = await response.json();
      
      if (!response.ok) {
        alert(`Failed to transfer ownership: ${result.error}`);
        return;
      }

      alert('Ownership transferred successfully!');
      if (result.newOwnerId) {
        setCurrentOwner(result.newOwnerId);
      }
      setNewOwnerId("");
      setNewOwnerEmail("");
      
    } catch (error) {
      console.error('Transfer error:', error);
      alert('An error occurred while transferring ownership.');
    } finally {
      setTransferring(false);
    }
  }

  if (loading) return <p className="p-8">{t('common.loading')}…</p>;
  if (error) return <p className="p-8 text-red-600">{error}</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">{t('organizations.editOrganization')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('organizations.organizationName')}</label>
          <input
            className="border p-2 w-full rounded"
            placeholder={t('organizations.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.description')}</label>
          <textarea
            className="border p-2 w-full rounded"
            placeholder={t('opportunity.description')}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('organizations.contactEmail')}</label>
          <input
            type="email"
            className="border p-2 w-full rounded"
            placeholder={t('organizations.enterContactEmail')}
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
          <p className="text-sm text-gray-500 mt-1">{t('organizations.emailUsageNote')}</p>
        </div>

        {/* Photos */}
        <div className="border rounded p-4">
          <h3 className="font-medium mb-2">{t('organizations.organizationPhotos')}</h3>
          <p className="text-sm text-gray-600 mb-3">{t('organizations.addPhotosDescription')}</p>
          <input id="edit-org-photo-input" type="file" accept="image/*" multiple onChange={handlePhotoChange} disabled={photos.length >= 5 || saving} />
          {photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {photos.map((p, idx) => (
                <div key={idx} className="relative">
                  <img src={p.preview} alt={`Photo ${idx + 1}`} className="w-full h-32 object-cover rounded" />
                  <button type="button" className="absolute top-1 right-1 bg-red-500 text-white rounded px-2 py-1 text-xs" onClick={() => handleRemovePhoto(idx)} disabled={saving}>
                    {t('organizations.removePhoto')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logo */}
        <div className="border rounded p-4">
          <h3 className="font-medium mb-2">{t('organizations.organizationLogo')}</h3>
          <p className="text-sm text-gray-600 mb-3">{t('organizations.addLogoDescription')}</p>
          <input id="edit-org-logo-input" type="file" accept="image/*" onChange={handleLogoFileChange} disabled={!!newLogo || saving} />
          <div className="mt-3">
            {newLogo ? (
              <div className="relative inline-block">
                <img src={newLogo.preview} alt="Logo preview" className="w-24 h-24 object-cover rounded" />
                <button type="button" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-sm" onClick={handleRemoveLogo} disabled={saving}>×</button>
              </div>
            ) : logoUrl ? (
              <div className="relative inline-block">
                <img src={logoUrl} alt="Current logo" className="w-24 h-24 object-cover rounded" />
                <button type="button" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-sm" onClick={handleRemoveLogo} disabled={saving}>×</button>
              </div>
            ) : (
              <p className="text-sm text-gray-600">{t('organizations.dragDropOrClickLogo')}</p>
            )}
          </div>
        </div>

        {/* Ownership Transfer - Admin Only */}
        {isAdmin && (
          <div className="border border-red-200 rounded p-4 bg-red-50">
            <h3 className="font-medium mb-2 text-red-800">Transfer Ownership (Admin Only)</h3>
            <p className="text-sm text-red-600 mb-3">Transfer ownership of this organization to another user or email address.</p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Owner</label>
                <p className="text-sm text-gray-600">
                  {availableUsers.find(u => u.id === currentOwner)?.email || 'Unknown'}
                </p>
                {org?.pending_owner_email && (
                  <p className="text-sm text-orange-600 mt-1">
                    Pending transfer to: {org.pending_owner_email}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer to Email Address</label>
                <input
                  type="email"
                  className="border p-2 w-full rounded"
                  placeholder="Enter email address (can be new user)"
                  value={newOwnerEmail}
                  onChange={(e) => {
                    setNewOwnerEmail(e.target.value);
                    setNewOwnerId(""); // Clear user selection when typing email
                  }}
                  disabled={transferring}
                />
                <p className="text-xs text-gray-500 mt-1">If the user doesn't exist yet, they can sign up with this email to manage the organization.</p>
              </div>
              
              <div className="text-center text-gray-500">OR</div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer to Existing User</label>
                <select
                  className="border p-2 w-full rounded"
                  value={newOwnerId}
                  onChange={(e) => {
                    setNewOwnerId(e.target.value);
                    setNewOwnerEmail(""); // Clear email when selecting user
                  }}
                  disabled={transferring}
                >
                  <option value="">Select an existing user...</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.email} {user.name ? `(${user.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                type="button"
                onClick={handleTransferOwnership}
                disabled={(!newOwnerEmail && !newOwnerId) || (newOwnerId === currentOwner) || transferring}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {transferring ? 'Transferring...' : 'Transfer Ownership'}
              </button>
            </div>
          </div>
        )}

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          {saving ? t('profile.saving') : t('common.save')}
        </button>
      </form>
    </div>
  );
} 