"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/protected-route";
import { useTranslations } from "next-intl";
import { isTestAccountEmail } from '@/lib/admin-config';

export default function SeniorProjectDetailPage() {
  const { id } = useParams() as { id: string };
  const t = useTranslations();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [signedUp, setSignedUp] = useState(false);
  const [signupCount, setSignupCount] = useState<number>(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showSignupOnboarding, setShowSignupOnboarding] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      const { data: proj, error } = await supabase
        .from('senior_projects')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !proj) {
        setError('Project not found');
        setLoading(false);
        return;
      }
      setProject(proj);

      // Prefill name/email from profile
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();
        setName(profile?.full_name || '');
        setEmail(user.email || '');

        const { data: existing } = await supabase
          .from('senior_project_signups')
          .select('id')
          .eq('project_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        setSignedUp(!!existing);
      }

      const { count } = await supabase
        .from('senior_project_signups')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', id);
      setSignupCount(count || 0);
      setLoading(false);

      // Check if user has seen signup onboarding for this page (always show for test account)
      if (user) {
        const hasSeenSignupOnboarding = localStorage.getItem('senior-project-signup-onboarding-seen');
        const isTestAccount = isTestAccountEmail(user?.email);
        if ((!hasSeenSignupOnboarding || isTestAccount) && !signedUp) {
          setTimeout(() => setShowSignupOnboarding(true), 1000);
        }
      }
    }
    load();
  }, [id]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      alert('Please sign in to sign up');
      return;
    }
    const { error } = await supabase
      .from('senior_project_signups')
      .insert({ project_id: id, user_id: userId, name, email });
    if (error) {
      if (error.code === '23505') {
        setSignedUp(true);
        return;
      }
      alert(error.message);
      return;
    }
    setSignedUp(true);
    setSignupCount((c) => c + 1);
  }

  if (loading) return <main className="max-w-3xl mx-auto p-6 text-gray-600 dark:text-gray-400">Loading...</main>;
  if (error) return <main className="max-w-3xl mx-auto p-6 text-red-600 dark:text-red-400">{error}</main>;

  return (
    <ProtectedRoute>
      <main className="max-w-3xl mx-auto p-6">
        {project?.poster_url && (
          <div className="relative mb-6">
            <img 
              src={project.poster_url} 
              alt={project.title}
              className={`w-full rounded-lg shadow transition-opacity duration-200 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ 
                objectFit: 'contain',
                maxHeight: '600px',
                backgroundColor: '#f9fafb'
              }}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
                <div className="text-gray-400">Loading poster...</div>
              </div>
            )}
            {imageError && (
              <div className="w-full h-64 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-500">
                <div className="text-4xl mb-2">📄</div>
                <div className="text-sm">Failed to load poster</div>
              </div>
            )}
          </div>
        )}
        <h1 className="text-3xl font-bold text-voluna-primary dark:text-voluna-accent mb-2">{project.title}</h1>
        {project.description && <p className="text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-wrap text-base leading-relaxed">{project.description}</p>}
        <div className="mb-6 text-base text-gray-500 dark:text-gray-400">{t('seniorProject.signups')}: {signupCount}</div>

        {!signedUp ? (
          <form onSubmit={handleSignup} className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">{t('seniorProject.name')}</label>
              <input className="border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 p-3 w-full rounded-lg text-base" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">{t('seniorProject.email')}</label>
              <input type="email" className="border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 p-3 w-full rounded-lg text-base" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="bg-voluna-accent text-voluna-text-light px-4 py-2 rounded-lg hover:bg-voluna-accent-hover text-base">{t('seniorProject.signUp')}</button>
            </div>
          </form>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-700 dark:text-green-400">{t('seniorProject.signedUp')}</div>
        )}

        {/* Signup Onboarding Tooltip */}
        {showSignupOnboarding && !signedUp && (
          <div className="fixed bottom-6 right-6 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-900 dark:text-gray-100 rounded-lg shadow-2xl p-4 max-w-sm z-50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-voluna-accent bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-voluna-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">{t('seniorProject.onboarding.signupTitle')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t('seniorProject.onboarding.signupDescription')}</p>
                <button
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!isTestAccountEmail(user?.email)) {
                      localStorage.setItem('senior-project-signup-onboarding-seen', 'true');
                    }
                    setShowSignupOnboarding(false);
                  }}
                  className="text-sm bg-voluna-accent text-white hover:bg-voluna-accent-hover px-3 py-1 rounded transition-colors"
                >
                  {t('seniorProject.onboarding.gotIt')}
                </button>
              </div>
              <button
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!isTestAccountEmail(user?.email)) {
                    localStorage.setItem('senior-project-signup-onboarding-seen', 'true');
                  }
                  setShowSignupOnboarding(false);
                }}
                className="text-white opacity-70 hover:opacity-100 ml-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}