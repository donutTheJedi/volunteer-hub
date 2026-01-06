"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createSignupConfirmationEmail } from "@/lib/email-templates";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function OpportunityDetail() {
  const t = useTranslations();
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [opp, setOpp] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", institute: "", email: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [error, setError] = useState("");
  const [signups, setSignups] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [signupsCount, setSignupsCount] = useState<{ [oppId: string]: number }>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: opp, error: oppError } = await supabase
        .from("opportunities")
        .select("*, organizations(name)")
        .eq("id", id)
        .single();
      if (oppError || !opp) {
        setError(t('opportunity.opportunityNotFound'));
        setLoading(false);
        return;
      }
      setOpp(opp);
      setOrg(opp.organizations);
      setLoading(false);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        // Profile check
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!profile) {
          router.replace('/profile');
          return;
        }
        // Load user profile to auto-fill form
        await loadUserProfile(user);
        
        // Debug log for signup check
        console.log('Checking signup for user_id:', user.id, 'opportunity_id:', id);
        // Check if already signed up for THIS opportunity
        const { data: signup, error } = await supabase
          .from("signups")
          .select("user_id, opportunity_id")
          .eq("user_id", user.id)
          .eq("opportunity_id", id)
          .maybeSingle();

        if (error) {
          console.error('Supabase error:', error);
          setSignedUp(false); // or show an error message
          return;
        }
        if (signup) setSignedUp(true);
        else setSignedUp(false);
      }
    }
    load();
  }, [id]);

  async function loadUserProfile(user: any) {
    setProfileLoading(true);
    try {
      // Try to get user profile from user_profiles table
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('full_name, phone, institution')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        // Auto-fill form with profile data
        setForm({
          name: profile.full_name || '',
          phone: profile.phone || '',
          institute: profile.institution || '',
          email: user.email || ''
        });
      } else {
        // No profile found, just use email from auth
        setForm({
          name: '',
          phone: '',
          institute: '',
          email: user.email || ''
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Fallback to just email
      setForm({
        name: '',
        phone: '',
        institute: '',
        email: user.email || ''
      });
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    async function fetchSignupsCount() {
      if (!opp) {
        setSignupsCount({});
        return;
      }
      const oppIds = [opp.id];
      const { data: signups } = await supabase
        .from('signups')
        .select('opportunity_id', { count: 'exact', head: false })
        .in('opportunity_id', oppIds);
      // Count signups per opportunity
      const countMap: { [oppId: string]: number } = {};
      for (const oppId of oppIds) {
        countMap[oppId] = signups?.filter(s => s.opportunity_id === oppId).length ?? 0;
      }
      setSignupsCount(countMap);
    }
    fetchSignupsCount();
  }, [opp]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    // Check if opportunity has already started
    if (new Date(opp.start_time) <= new Date()) {
      setError("This opportunity has already started and signups are no longer accepted.");
      return;
    }
    
    // Debug log for signup check on submit
    console.log('Submit: checking signup for user_id:', user.id, 'opportunity_id:', id);
    // Check again before insert for THIS opportunity
    const { data: existing } = await supabase
      .from("signups")
      .select("user_id, opportunity_id")
      .eq("user_id", user.id)
      .eq("opportunity_id", id)
      .maybeSingle();
    if (existing) {
      setSignedUp(true);
      return;
    }
    if (!form.name || !form.phone) {
      setError("Name and phone are required.");
      return;
    }
    console.log('Trying to insert signup:', {
      user_id: user.id,
      opportunity_id: id,
      name: form.name,
      phone: form.phone,
      institute: form.institute,
    });
    const { error } = await supabase.from("signups").insert({
      user_id: user.id,
      opportunity_id: id,
      name: form.name,
      phone: form.phone,
      institute: form.institute,
      email: form.email,
    });
    if (error) {
      // If unique constraint error, treat as already signed up
      if (error.code === '23505') {
        setSignedUp(true);
        return;
      }
      setError(error.message);
      return;
    }
    setSignedUp(true);
    // Send signup confirmation email
    if (user?.email) {
      // Calculate estimated hours
      let estimatedHours = 0;
      if (opp?.start_time && opp?.end_time) {
        const startTime = new Date(opp.start_time);
        const endTime = new Date(opp.end_time);
        estimatedHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      }
      
      const emailHtml = createSignupConfirmationEmail({
        name: form.name,
        opportunityTitle: opp?.title ?? '',
        startTime: opp?.start_time ? new Date(opp.start_time).toLocaleString() : '',
        location: opp?.location,
        estimatedHours: Math.round(estimatedHours * 10) / 10,
        organizationName: org?.name
      });
      
      fetch('/api/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: `Confirmation: ${opp?.title ?? ''}`,
          html: emailHtml
        }),
      });
    }
    // Redirect to landing page
    router.push('/');
  }

  if (loading) return <p className="p-8">{t('common.loading')}…</p>;
  if (error) return <p className="p-8 text-red-600">{error}</p>;

  return (
    <main className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">{opp.title}</h1>
      <div className="text-gray-600">{t('opportunity.by')} {org?.name}</div>
      <div className="text-gray-600">
        {new Date(opp.start_time).toLocaleString()} – {new Date(opp.end_time).toLocaleString()}
      </div>
      <div className="text-gray-700 whitespace-pre-line">{opp.description}</div>
      {/* Photo gallery */}
      {Array.isArray(opp.photos) && opp.photos.length > 0 && (
        <div className="my-4">
          <h2 className="text-lg font-semibold mb-2">{t('opportunity.photos')}</h2>
          <div className="flex flex-wrap gap-4">
            {opp.photos.map((photo: { url: string; description?: string }, idx: number) => (
              <div key={idx} className="w-40">
                <img
                  src={photo.url}
                  alt={photo.description || `Photo ${idx + 1}`}
                  className="w-full h-32 object-cover rounded border mb-1"
                />
                {photo.description && (
                  <div className="text-xs text-gray-600 whitespace-pre-line">{photo.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="text-gray-700">{t('opportunity.location')}: {opp.location}</div>
      {opp.location && (
        <div className="w-full mt-2 flex justify-center">
          <iframe
            width="100%"
            height="250"
            style={{ border: 0, borderRadius: 8, maxWidth: 400 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${encodeURIComponent(opp.location)}&z=15&output=embed`}
          />
        </div>
      )}
      <div className="text-gray-700">{t('opportunity.needed')}: {opp.needed}</div>
      {isOwner && signups.length > 0 && (
        <div className="my-6">
          <h2 className="text-lg font-semibold mb-2">{t('opportunity.signups')}</h2>
          <ul className="space-y-2">
            {signups.map((s, i) => (
              <li key={i} className="border p-2 rounded">
                <div><span className="font-bold">{s.name}</span> ({s.phone})</div>
                {s.institute && <div className="text-sm text-gray-600">{t('auth.institution')}: {s.institute}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {user ? (
        signedUp ? (
          <div className="text-voluna-secondary font-semibold bg-voluna-background border border-voluna-secondary rounded p-4">
            {t('opportunity.alreadySignedUp')}
          </div>
        ) : new Date(opp.start_time) <= new Date() ? (
          <div className="text-gray-600 font-semibold bg-gray-100 border border-gray-300 rounded p-4">
            {t('opportunity.opportunityAlreadyStarted')}
          </div>
        ) : (
          <div className="space-y-6">
                          <div className="bg-voluna-background border border-voluna-secondary rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-voluna-primary mb-2">{t('opportunity.signUpForThisOpportunity')}</h3>
          <p className="text-sm text-voluna-primary">
                {profileLoading ? t('opportunity.loadingProfile') : t('opportunity.profileAutoFilled')}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.fullName')}</label>
                <input
                  className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder={t('profile.enterFullName')}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  disabled={profileLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
                <input
                  className="border border-gray-300 p-3 w-full rounded-lg bg-gray-50 text-gray-600"
                  value={form.email}
                  disabled
                  placeholder={t('opportunity.emailFromAccount')}
                />
                <p className="text-xs text-gray-500 mt-1">{t('opportunity.emailFromAccountNote')}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.phone')}</label>
                <input
                  className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder={t('profile.enterPhoneNumber')}
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  required
                  disabled={profileLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('opportunity.institutionOptional')}</label>
                <input
                  className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder={t('profile.enterInstitution')}
                  value={form.institute}
                  onChange={e => setForm({ ...form, institute: e.target.value })}
                  disabled={profileLoading}
                />
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              
              <button 
                className="bg-green-600 text-white px-6 py-3 rounded-lg w-full font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                disabled={profileLoading}
              >
                {profileLoading ? t('common.loading') : t('opportunity.signUpForThisOpportunity')}
              </button>
            </form>
          </div>
        )
      ) : (
        <div>
          <Link href="/login" className="text-blue-600 underline">{t('opportunity.signInToSignUp')}</Link>
        </div>
      )}
    </main>
  );
} 