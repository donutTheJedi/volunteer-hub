'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import OrgProtectedRoute from '@/components/org-protected-route';
import { isAdminEmail } from '@/lib/admin-config';

// Simple icons
const EditIcon = () => (
  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13zm-6 6h6v-2a2 2 0 012-2h2a2 2 0 012 2v2h6" /></svg>
);
const DeleteIcon = () => (
  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
);
const CloseIcon = () => (
  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
);

type Opp = { id: string; title: string; start_time: string; needed: number; closed?: boolean };

export default function OrgDashboard() {
  const t = useTranslations();
  const { orgId } = useParams() as { orgId: string };
  
  return (
    <OrgProtectedRoute orgId={orgId}>
      <OrgDashboardContent />
    </OrgProtectedRoute>
  );
}

function OrgDashboardContent() {
  const t = useTranslations();
  const { orgId } = useParams() as { orgId: string };
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgDescription, setOrgDescription] = useState<string | null>(null);
  const [orgPhotos, setOrgPhotos] = useState<{ url: string }[] | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [opps, setOpps] = useState<Opp[] | null>(null);
  const [upcomingOpps, setUpcomingOpps] = useState<Opp[]>([]);
  const [pastOpps, setPastOpps] = useState<Opp[]>([]);
  const [noOrg, setNoOrg] = useState(false);
  const [isOwner, setIsOwner] = useState(true);
  const [signupsByOpp, setSignupsByOpp] = useState<Record<string, any[]>>({});
  const [userSignups, setUserSignups] = useState<string[]>([]);
  const [signupsCount, setSignupsCount] = useState<{ [oppId: string]: number }>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [orgOwnerId, setOrgOwnerId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [reachOutEmail, setReachOutEmail] = useState<string | null>(null);
  
  // Email functionality state
  const [showBulkEmailForm, setShowBulkEmailForm] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState('');
  const [bulkEmailMessage, setBulkEmailMessage] = useState('');
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);
  const [opportunityEmailForms, setOpportunityEmailForms] = useState<Record<string, boolean>>({});
  const [opportunityEmailData, setOpportunityEmailData] = useState<Record<string, { subject: string; message: string }>>({});
  const [sendingOpportunityEmails, setSendingOpportunityEmails] = useState<Record<string, boolean>>({});
  const [bulkEmailResult, setBulkEmailResult] = useState<string | null>(null);
  const [opportunityEmailResults, setOpportunityEmailResults] = useState<Record<string, string | null>>({});
  // Add state for mailto link
  const [mailtoLink, setMailtoLink] = useState<string | null>(null);
  const mailtoRef = useRef<HTMLAnchorElement>(null);
  const [preparedMailto, setPreparedMailto] = useState<string | null>(null);
  const [showGmailButton, setShowGmailButton] = useState(false);
  const [gmailLink, setGmailLink] = useState<string>('');

  useEffect(() => {
    async function load() {
      // User is already authenticated and authorized by OrgProtectedRoute
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
      
      // Fetch the organization
      const { data: org } = await supabase
        .from('organizations')
        .select('name, owner, description, photos, verification_status, reach_out_email')
        .eq('id', orgId)
        .single();

      if (!org) {
        setNoOrg(true);
        setOpps([]);
        return;
      }
      setOrgName(org.name);
      setOrgOwnerId(org.owner);
      setOrgDescription(org.description ?? null);
      setOrgPhotos(Array.isArray(org.photos) ? org.photos : null);
      setVerificationStatus(org.verification_status ?? null);
      setReachOutEmail(org.reach_out_email ?? null);
      setIsOwner(true); // User is guaranteed to be owner by OrgProtectedRoute

      // 3. fetch its opportunities
      const { data } = await supabase
        .from('opportunities')
        .select('id,title,start_time,needed,closed')
        .eq('org_id', orgId)
        .order('start_time');
      
      if (data) {
        const now = new Date();
        const upcoming = data.filter(opp => new Date(opp.start_time) > now);
        const past = data.filter(opp => new Date(opp.start_time) <= now);
        
        setOpps(data);
        setUpcomingOpps(upcoming);
        setPastOpps(past);
      } else {
        setOpps([]);
        setUpcomingOpps([]);
        setPastOpps([]);
      }
      // 4. fetch signups for all opps if owner
      if (data) {
        const ids = data.map((o: any) => o.id);
        if (ids.length > 0) {
          const { data: signups } = await supabase
            .from('signups')
            .select('user_id,opportunity_id,name,phone,institute,email')
            .in('opportunity_id', ids);

          console.log('Fetched opportunity ids:', ids);
          console.log('Fetched signups:', signups);
          const byOpp: Record<string, any[]> = {};
          for (const s of signups ?? []) {
            const key = String(s.opportunity_id);
            if (!byOpp[key]) byOpp[key] = [];
            byOpp[key].push(s);
          }
          setSignupsByOpp(byOpp);
        }
      }
      // Fetch signups count and user signups for all opps (for everyone)
      if (data && data.length > 0) {
        const oppIds = data.map((o: any) => o.id);
        // Fetch signups count
        const { data: signups } = await supabase
          .from('signups')
          .select('opportunity_id,user_id')
          .in('opportunity_id', oppIds);
        const countMap: { [oppId: string]: number } = {};
        for (const oppId of oppIds) {
          countMap[oppId] = signups?.filter(s => s.opportunity_id === oppId).length ?? 0;
        }
        setSignupsCount(countMap);
        // Fetch user signups
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserSignups(signups?.filter(s => s.user_id === user.id).map(s => s.opportunity_id) ?? []);
        } else {
          setUserSignups([]);
        }
      } else {
        setSignupsCount({});
        setUserSignups([]);
      }
    }

    load();
  }, [orgId]);

  if (opps === null) return <p className="p-8">{t('common.loading')}</p>;
  if (noOrg) return <p className="p-8">No organization found or you do not have access.</p>;

  async function handleDeleteOpp(oppId: string) {
    if (!confirm('Are you sure you want to delete this opportunity?')) return;
    
    console.log('Attempting to delete opportunity:', oppId);
    const { error, count } = await supabase.from('opportunities').delete().eq('id', oppId);
    
    console.log('Delete result:', { error, count });
    
    if (error) {
      console.error('Delete error:', error);
      alert('Error deleting opportunity: ' + error.message);
      return;
    }
    
    if (count === 0) {
      console.warn('No rows were deleted - opportunity may not exist or you may not have permission');
      alert('Opportunity not found or you do not have permission to delete it');
      return;
    }
    
    console.log('Successfully deleted opportunity, updating UI');
    // Only update UI state if database deletion was successful
    setOpps((prev) => prev ? prev.filter((o) => o.id !== oppId) : prev);
  }

  async function handleCloseOpp(oppId: string) {
    const { error } = await supabase.from('opportunities').update({ closed: true }).eq('id', oppId);
    if (error) {
      alert('Error closing signups: ' + error.message);
      return;
    }
    setOpps((prev) => prev ? prev.map((o) => o.id === oppId ? { ...o, closed: true } : o) : prev);
  }

  async function handleOpenOpp(oppId: string) {
    const { error } = await supabase.from('opportunities').update({ closed: false }).eq('id', oppId);
    if (error) {
      alert('Error opening signups: ' + error.message);
      return;
    }
    setOpps((prev) => prev ? prev.map((o) => o.id === oppId ? { ...o, closed: false } : o) : prev);
  }

  async function handleRemoveSignup(oppId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('signups')
      .delete()
      .eq('opportunity_id', oppId)
      .eq('user_id', user.id);
    if (error) {
      alert('Error removing signup: ' + error.message);
      return;
    }
    setUserSignups((prev) => prev.filter((id) => id !== oppId));
    setSignupsCount((prev) => ({ ...prev, [oppId]: (prev[oppId] ?? 1) - 1 }));
  }

  async function handleDeleteOrg() {
    if (!confirm('Are you sure you want to delete this organization?')) return;
    
    try {
      // Check if this is an admin-managed organization and if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || '';
      const isAdmin = isAdminEmail(email);
      const isAdminManaged = reachOutEmail;
      
      if (isAdminManaged && isAdmin) {
        // Use admin API endpoint for admin-managed organizations
        const response = await fetch(`/api/admin/delete-organization?orgId=${orgId}`, {
          method: 'DELETE',
          headers: {
            'x-requester-email': user?.email || '',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          alert('Error deleting organization: ' + (errorData.error || 'Unknown error'));
          return;
        }
        
        const result = await response.json();
        alert(result.message || 'Organization deleted successfully');
      } else {
        // Use regular client for user-owned organizations
        const { error } = await supabase.from('organizations').delete().eq('id', orgId);
        if (error) {
          alert('Error deleting organization: ' + error.message);
          return;
        }
      }
      
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Delete error:', err);
      alert('An unexpected error occurred while deleting');
    }
  }

  // Helper to get all unique emails for all signups
  function getAllVolunteerEmails(): string[] {
    const emails = new Set<string>();
    Object.values(signupsByOpp).forEach(signups => {
      signups.forEach((s: { email?: string }) => {
        if (s.email) emails.add(s.email);
      });
    });
    return Array.from(emails);
  }


  function toggleOpportunityEmailForm(opportunityId: string) {
    setOpportunityEmailForms(prev => ({ ...prev, [opportunityId]: !prev[opportunityId] }));
    if (!opportunityEmailData[opportunityId]) {
      setOpportunityEmailData(prev => ({ ...prev, [opportunityId]: { subject: '', message: '' } }));
    }
  }

  function updateOpportunityEmailData(opportunityId: string, field: 'subject' | 'message', value: string) {
    setOpportunityEmailData(prev => ({
      ...prev,
      [opportunityId]: { ...prev[opportunityId], [field]: value }
    }));
  }


  console.log('isOwner:', isOwner, 'opps:', opps);
  console.log('signupsByOpp:', signupsByOpp);

  return (
    <>
      {/* Full-bleed hero for non-owners */}
      {!isOwner && orgPhotos && orgPhotos.length > 0 && (
        <section className="relative w-screen left-1/2 right-1/2 -mx-[50vw] overflow-hidden" style={{ height: '48vh', minHeight: 280, maxHeight: 420 }}>
          <img
            src={orgPhotos[0].url}
            alt="Organization main photo"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/20 flex items-center justify-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white text-center drop-shadow-lg px-4">
              {orgName}
            </h1>
          </div>
        </section>
      )}
      <main
        className={
          `max-w-3xl mx-auto p-6 space-y-8 relative z-10 bg-white shadow-xl rounded-2xl`
        }
        style={!isOwner && orgPhotos && orgPhotos.length > 0 ? { marginTop: '-120px' } : {}}
      >
        <div className="flex items-center justify-between mb-2">
          {isOwner && <h1 className="text-3xl font-extrabold text-voluna-primary">{orgName}</h1>}
          {isOwner && (
          <div className="relative">
            <button
              className="p-2 rounded-full hover:bg-gray-100 focus:outline-none"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Organization menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-10">
                <Link
                  href={`/dashboard/${orgId}/edit`}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  onClick={() => setMenuOpen(false)}
                >
                  <EditIcon /> {t('organizations.editOrganization')}
                </Link>
                <button
                  className="block w-full text-left px-4 py-2 text-red-700 hover:bg-red-50"
                  onClick={() => { setMenuOpen(false); handleDeleteOrg(); }}
                >
                  <DeleteIcon /> {t('organizations.deleteOrganization')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {isOwner && verificationStatus === 'approved' && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Link href={`/dashboard/${orgId}/new`} className="inline-flex items-center gap-2 bg-voluna-accent text-voluna-text-light px-5 py-2 rounded-lg shadow hover:bg-voluna-accent-hover font-semibold transition">
              + {t('opportunity.addOpportunity')}
            </Link>
            <button
              onClick={() => setShowBulkEmailForm(!showBulkEmailForm)}
              className="inline-flex items-center gap-2 bg-voluna-secondary text-voluna-text-light px-5 py-2 rounded-lg shadow hover:bg-voluna-background font-semibold transition"
            >
              📧 {t('dashboard.emailAllUsers')}
            </button>
          </div>
          
          {/* Bulk Email Form */}
          {showBulkEmailForm && (
            <div className="bg-voluna-background border border-voluna-secondary rounded-lg p-4">
              <h3 className="text-lg font-semibold text-voluna-primary mb-3">{t('dashboard.sendEmailToAllUsers')}</h3>
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  setBulkEmailResult(null);
                  setSendingBulkEmail(true);
                  try {
                    const res = await fetch('/api/send-bulk-emails', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subject: bulkEmailSubject, message: bulkEmailMessage })
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setBulkEmailResult(data.message || 'Emails sent successfully.');
                      setBulkEmailSubject('');
                      setBulkEmailMessage('');
                    } else {
                      setBulkEmailResult(data.error || 'Failed to send emails.');
                    }
                  } catch (err) {
                    setBulkEmailResult('Unexpected error sending emails.');
                  } finally {
                    setSendingBulkEmail(false);
                  }
                }}
                className="space-y-3"
              >
                <input
                  type="text"
                  placeholder={t('dashboard.emailSubject')}
                  value={bulkEmailSubject}
                  onChange={(e) => setBulkEmailSubject(e.target.value)}
                  className="w-full border border-voluna-secondary rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-voluna-accent"
                  required
                />
                <textarea
                  placeholder={t('dashboard.emailMessage')}
                  value={bulkEmailMessage}
                  onChange={(e) => setBulkEmailMessage(e.target.value)}
                  className="w-full border border-voluna-secondary rounded px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-voluna-accent"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-voluna-accent text-voluna-text-light px-4 py-2 rounded hover:bg-voluna-accent-hover font-semibold disabled:opacity-60"
                    disabled={sendingBulkEmail}
                  >
                    {sendingBulkEmail ? t('common.loading') : t('common.submit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkEmailForm(false);
                      setBulkEmailResult(null);
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 font-semibold"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
                {bulkEmailResult && (
                  <p className="text-sm text-voluna-secondary">{bulkEmailResult}</p>
                )}
              </form>
            </div>
          )}
        </div>
      )}
      {isOwner && verificationStatus === 'pending' && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="font-semibold text-yellow-800">{t('organizations.verificationPending')}</div>
          <div className="text-yellow-800 text-sm">{t('organizations.pendingShort', { default: t('organizations.verificationPendingMessage') })}</div>
        </div>
      )}
      {/* Pending verification banner handled below based on verificationStatus */}
      {/* For non-owners, show description below the hero */}
      {!isOwner && orgDescription && (
        <div className="text-gray-800 text-base mb-8 whitespace-pre-line text-center max-w-2xl mx-auto">
          {orgDescription}
        </div>
      )}
      {/* Opportunities list for everyone */}
      {opps && opps.length > 0 ? (
        <div>
          {/* Upcoming Opportunities */}
          {upcomingOpps.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-voluna-primary mb-4">{t('dashboard.upcomingOpportunities')}</h2>
              <ul className="space-y-6">
                {upcomingOpps.map((o) => {
              const spotsLeft = o.needed - (signupsCount[o.id] ?? 0);
              return (
                <li
                  key={o.id}
                  className="bg-white border border-voluna-background rounded-xl shadow-sm p-6 hover:shadow-md transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <Link href={`/opportunity/${o.id}`} className="font-bold text-lg text-voluna-primary hover:underline cursor-pointer">
                        {o.title}
                      </Link>
                      <div className="text-gray-600 text-sm mt-1">{new Date(o.start_time).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                      {userSignups.includes(o.id) && (
                        <>
                          <span className="text-voluna-secondary bg-voluna-background px-2 py-1 rounded text-xs font-semibold mr-2">{t('opportunities.signedUp')}</span>
                          <button
                            onClick={() => handleRemoveSignup(o.id)}
                            className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition"
                          >
                            {t('opportunities.removeSignup')}
                          </button>
                        </>
                      )}
                      {o.closed ? (
                        <span className="text-gray-700 bg-gray-200 px-2 py-1 rounded text-xs font-semibold">{t('opportunities.closed')}</span>
                      ) : spotsLeft <= 0 ? (
                        <span className="text-red-700 bg-red-100 px-2 py-1 rounded text-xs font-semibold">{t('opportunities.full')}</span>
                      ) : (
                        <span className="text-gray-700 bg-gray-100 px-2 py-1 rounded text-xs font-semibold">{t('opportunities.spotsLeft', { count: spotsLeft })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {!o.closed ? (
                      <Link
                        href={`/opportunity/${o.id}`}
                                                    className="bg-voluna-accent text-voluna-text-light px-4 py-2 rounded-lg text-sm font-semibold hover:bg-voluna-accent-hover transition"
                      >
                        {t('opportunities.signUp')}
                      </Link>
                    ) : null}
                    {isOwner && (
                      <>
                        <Link
                          href={`/dashboard/${orgId}/opportunity/${o.id}/edit`}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-voluna-background text-voluna-primary rounded-lg font-semibold hover:bg-voluna-secondary transition"
                        >
                          <EditIcon /> {t('common.edit')}
                        </Link>
                        <button
                          onClick={() => handleDeleteOpp(o.id)}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition"
                        >
                          <DeleteIcon /> {t('common.delete')}
                        </button>
                        {!o.closed && (
                          <button
                            onClick={() => handleCloseOpp(o.id)}
                            className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
                          >
                            <CloseIcon /> {t('opportunity.closeSignups')}
                          </button>
                        )}
                        {o.closed && (
                          <button
                            onClick={() => handleOpenOpp(o.id)}
                            className="inline-flex items-center gap-1 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-semibold hover:bg-yellow-200 transition"
                          >
                            <CloseIcon /> {t('opportunity.openSignups')}
                          </button>
                        )}
                        <button
                          onClick={() => toggleOpportunityEmailForm(o.id)}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-voluna-secondary text-voluna-text-light rounded-lg font-semibold hover:bg-voluna-accent transition"
                        >
                          📧 Email Volunteers
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Opportunity Email Form */}
                  {isOwner && opportunityEmailForms[o.id] && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-800 mb-3">Email volunteers for "{o.title}"</h4>
                      <form
                        onSubmit={async e => {
                          e.preventDefault();
                          setOpportunityEmailResults(prev => ({ ...prev, [o.id]: null }));
                          setSendingOpportunityEmails(prev => ({ ...prev, [o.id]: true }));
                          try {
                            const res = await fetch('/api/send-opportunity-emails', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                opportunityId: o.id,
                                subject: opportunityEmailData[o.id]?.subject || '',
                                message: opportunityEmailData[o.id]?.message || ''
                              })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setOpportunityEmailResults(prev => ({ ...prev, [o.id]: data.message || 'Emails sent successfully.' }));
                              setOpportunityEmailData(prev => ({ ...prev, [o.id]: { subject: '', message: '' } }));
                            } else {
                              setOpportunityEmailResults(prev => ({ ...prev, [o.id]: data.error || 'Failed to send emails.' }));
                            }
                          } catch (err) {
                            setOpportunityEmailResults(prev => ({ ...prev, [o.id]: 'Unexpected error sending emails.' }));
                          } finally {
                            setSendingOpportunityEmails(prev => ({ ...prev, [o.id]: false }));
                          }
                        }}
                        className="space-y-3"
                      >
                        <input
                          type="text"
                          placeholder="Email subject"
                          value={opportunityEmailData[o.id]?.subject || ''}
                          onChange={(e) => updateOpportunityEmailData(o.id, 'subject', e.target.value)}
                          className="w-full border border-voluna-secondary rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-voluna-accent"
                          required
                        />
                        <textarea
                          placeholder="Email message"
                          value={opportunityEmailData[o.id]?.message || ''}
                          onChange={(e) => updateOpportunityEmailData(o.id, 'message', e.target.value)}
                          className="w-full border border-voluna-secondary rounded px-3 py-2 h-20 focus:outline-none focus:ring-2 focus:ring-voluna-accent"
                          required
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="bg-voluna-accent text-voluna-text-light px-4 py-2 rounded hover:bg-voluna-accent-hover font-semibold disabled:opacity-60"
                            disabled={!!sendingOpportunityEmails[o.id]}
                          >
                            {sendingOpportunityEmails[o.id] ? 'Sending…' : 'Send'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpportunityEmailForms(prev => ({ ...prev, [o.id]: false }));
                              setOpportunityEmailResults(prev => ({ ...prev, [o.id]: null }));
                            }}
                            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                        {opportunityEmailResults[o.id] && (
                          <p className="text-sm text-voluna-secondary">{opportunityEmailResults[o.id]}</p>
                        )}
                      </form>
                    </div>
                  )}
                  {isOwner && (
                    <div className="mt-6">
                      <div className="font-bold mb-2 text-voluna-secondary">Signups</div>
                      {(signupsByOpp[String(o.id)]?.length ?? 0) > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border text-sm rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-voluna-background">
                                <th className="border px-2 py-1 text-left">Name</th>
                                <th className="border px-2 py-1 text-left">Email</th>
                                <th className="border px-2 py-1 text-left">Phone</th>
                                <th className="border px-2 py-1 text-left">Institute</th>
                              </tr>
                            </thead>
                            <tbody>
                              {signupsByOpp[String(o.id)].map((s, i) => (
                                <tr key={i} className="even:bg-voluna-background">
                                  <td className="border px-2 py-1">{s.name}</td>
                                  <td className="border px-2 py-1">{s.email}</td>
                                  <td className="border px-2 py-1">{s.phone}</td>
                                  <td className="border px-2 py-1">{s.institute}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-gray-500">No signups yet.</div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
          )}
          
          {/* Past Opportunities */}
          {pastOpps.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-700 mb-4">Past Opportunities</h2>
              <ul className="space-y-6">
                {pastOpps.map((o) => {
                  const spotsLeft = o.needed - (signupsCount[o.id] ?? 0);
                  return (
                    <li
                      key={o.id}
                      className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <Link href={`/opportunity/${o.id}`} className="font-bold text-lg text-gray-800 hover:underline cursor-pointer">
                            {o.title}
                          </Link>
                          <div className="text-gray-600 text-sm mt-1">{new Date(o.start_time).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          <span className="text-gray-600 bg-gray-200 px-2 py-1 rounded text-xs font-semibold">Completed</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {isOwner && (
                          <>
                            <Link
                              href={`/dashboard/${orgId}/opportunity/${o.id}/edit`}
                              className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 transition"
                            >
                              <EditIcon /> Edit
                            </Link>
                            <button
                              onClick={() => handleDeleteOpp(o.id)}
                              className="inline-flex items-center gap-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition"
                            >
                              <DeleteIcon /> Delete
                            </button>
                            <button
                              onClick={() => toggleOpportunityEmailForm(o.id)}
                              className="inline-flex items-center gap-1 px-4 py-2 bg-voluna-secondary text-voluna-text-light rounded-lg font-semibold hover:bg-voluna-accent transition"
                            >
                              📧 Email Volunteers
                            </button>
                          </>
                        )}
                      </div>
                      
                      {/* Opportunity Email Form for Past Opportunities */}
                      {isOwner && opportunityEmailForms[o.id] && (
                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="text-md font-semibold text-blue-800 mb-3">Email volunteers for "{o.title}"</h4>
                          <form
                            onSubmit={async e => {
                              e.preventDefault();
                              setOpportunityEmailResults(prev => ({ ...prev, [o.id]: null }));
                              setSendingOpportunityEmails(prev => ({ ...prev, [o.id]: true }));
                              try {
                                const res = await fetch('/api/send-opportunity-emails', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    opportunityId: o.id,
                                    subject: opportunityEmailData[o.id]?.subject || '',
                                    message: opportunityEmailData[o.id]?.message || ''
                                  })
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  setOpportunityEmailResults(prev => ({ ...prev, [o.id]: data.message || 'Emails sent successfully.' }));
                                  setOpportunityEmailData(prev => ({ ...prev, [o.id]: { subject: '', message: '' } }));
                                } else {
                                  setOpportunityEmailResults(prev => ({ ...prev, [o.id]: data.error || 'Failed to send emails.' }));
                                }
                              } catch (err) {
                                setOpportunityEmailResults(prev => ({ ...prev, [o.id]: 'Unexpected error sending emails.' }));
                              } finally {
                                setSendingOpportunityEmails(prev => ({ ...prev, [o.id]: false }));
                              }
                            }}
                            className="space-y-3"
                          >
                            <input
                              type="text"
                              placeholder="Email subject"
                              value={opportunityEmailData[o.id]?.subject || ''}
                              onChange={(e) => updateOpportunityEmailData(o.id, 'subject', e.target.value)}
                              className="w-full border border-blue-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                            <textarea
                              placeholder="Email message"
                              value={opportunityEmailData[o.id]?.message || ''}
                              onChange={(e) => updateOpportunityEmailData(o.id, 'message', e.target.value)}
                              className="w-full border border-voluna-secondary rounded px-3 py-2 h-20 focus:outline-none focus:ring-2 focus:ring-voluna-accent"
                              required
                            />
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                className="bg-voluna-accent text-voluna-text-light px-4 py-2 rounded hover:bg-voluna-accent-hover font-semibold disabled:opacity-60"
                                disabled={!!sendingOpportunityEmails[o.id]}
                              >
                                {sendingOpportunityEmails[o.id] ? 'Sending…' : 'Send'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpportunityEmailForms(prev => ({ ...prev, [o.id]: false }));
                                  setOpportunityEmailResults(prev => ({ ...prev, [o.id]: null }));
                                }}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                            {opportunityEmailResults[o.id] && (
                              <p className="text-sm text-voluna-secondary">{opportunityEmailResults[o.id]}</p>
                            )}
                          </form>
                        </div>
                      )}
                      {isOwner && (
                        <div className="mt-6">
                          <div className="font-bold mb-2 text-gray-700">Signups</div>
                          {(signupsByOpp[String(o.id)]?.length ?? 0) > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full border text-sm rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="border px-2 py-1 text-left">Name</th>
                                    <th className="border px-2 py-1 text-left">Email</th>
                                    <th className="border px-2 py-1 text-left">Phone</th>
                                    <th className="border px-2 py-1 text-left">Institute</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {signupsByOpp[String(o.id)].map((s, i) => (
                                    <tr key={i} className="even:bg-gray-50">
                                      <td className="border px-2 py-1">{s.name}</td>
                                      <td className="border px-2 py-1">{s.email}</td>
                                      <td className="border px-2 py-1">{s.phone}</td>
                                      <td className="border px-2 py-1">{s.institute}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-gray-500">No signups yet.</div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">{t('organizations.noOpportunities')}</p>
          {isOwner && verificationStatus === 'approved' ? (
            <Link href={`/dashboard/${orgId}/new`} className="inline-flex items-center gap-2 bg-voluna-accent text-voluna-text-light px-5 py-2 rounded-lg shadow hover:bg-voluna-accent-hover font-semibold transition">
              + {t('opportunity.addOpportunity')}
            </Link>
          ) : (
            <p className="text-sm text-gray-600 max-w-md mx-auto">{t('organizations.verificationPendingMessage')}</p>
          )}
        </div>
      )}
    </main>
    </>
  );
}
