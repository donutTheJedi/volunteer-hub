'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import GeolocationDetector from '@/components/GeolocationDetector';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [hasCompleteProfile, setHasCompleteProfile] = useState<boolean | null>(null);
  const [ownedOrgs, setOwnedOrgs] = useState<{ id: string }[]>([]);
  const [isHarkness, setIsHarkness] = useState(false);
  const [stats, setStats] = useState<{
    volunteers: number;
    organizations: number;
    hoursDonated: number;
  } | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadState() {
      if (!user) {
        setHasProfile(null);
        setHasCompleteProfile(null);
        setOwnedOrgs([]);
        return;
      }
      setLoading(true);
      try {
        const [{ data: profile }, { data: orgs }] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('user_id, institution')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('organizations')
            .select('id')
            .eq('owner', user.id)
        ]);

        if (!isActive) return;
        setHasProfile(!!profile);
        setHasCompleteProfile(!!(profile && profile.institution));
        setOwnedOrgs(orgs ?? []);
        
        // Check if user is from Harkness Institute
        if (profile?.institution) {
          const inst = profile.institution.toLowerCase();
          setIsHarkness(inst === 'harkness institute');
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }

    async function loadStats() {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        if (!isActive) return;
        setStats(data);
      } catch (error) {
        console.error('Error loading stats:', error);
        // Set fallback stats if there's an error
        setStats({
          volunteers: 0,
          organizations: 0,
          hoursDonated: 0
        });
      }
    }

    loadState();
    loadStats();
    return () => {
      isActive = false;
    };
  }, [user]);
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-voluna-background dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              <span className="block">{t('landing.hero.title').split('.')[0]}.</span>
              <span className="block bg-gradient-to-r from-voluna-accent to-emerald-600 bg-clip-text text-transparent">
                {t('landing.hero.title').split('.')[1]}.
              </span>
              <span className="block">{t('landing.hero.title').split('.')[2]}.</span>
          </h1>
            
            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              {t('landing.hero.subtitle')}
            </p>

          {/* CTA based on state */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            {authLoading || loading ? (
                <div className="h-12 w-48 bg-gray-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
            ) : !user ? (
              <>
                <Link
                  href={`/${locale}/signup`}
                    className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-red-600 to-emerald-600 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                >
                    <span className="relative z-10">{t('auth.createAccountButton')}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </Link>
                <Link
                  href={`/${locale}/opportunities`}
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-900 dark:text-gray-200 bg-white dark:bg-neutral-800 border-2 border-gray-300 dark:border-neutral-700 rounded-xl hover:border-voluna-accent hover:bg-gray-50 dark:hover:bg-neutral-700 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
                >
                  {t('dashboard.browseOpportunities')}
                </Link>
              </>
            ) : hasProfile === false || hasCompleteProfile === false ? (
              <button
                onClick={() => window.location.replace(`/${locale}/profile?onboarding=1`)}
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-red-600 to-emerald-600 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                  <span className="relative z-10">{t('profile.completeProfile')}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </button>
            ) : ownedOrgs.length === 0 ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href={`/${locale}/opportunities`}
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-red-600 to-emerald-600 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                >
                  <span className="relative z-10">{t('dashboard.browseOpportunities')}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </Link>
                {isHarkness && (
                  <Link
                    href={`/${locale}/senior-projects`}
                    className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-900 dark:text-gray-200 bg-white dark:bg-neutral-800 border-2 border-gray-300 dark:border-neutral-700 rounded-xl hover:border-voluna-accent hover:bg-gray-50 dark:hover:bg-neutral-700 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
                  >
                    Senior Projects
                  </Link>
                )}
              </div>
              ) : ownedOrgs.length === 1 ? (
                <Link
                  href={`/${locale}/dashboard/${ownedOrgs[0].id}`}
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-red-600 to-emerald-600 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                >
                  <span className="relative z-10">{t('common.dashboard')}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </Link>
            ) : (
              <Link
                href={`/${locale}/dashboard`}
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-red-600 to-emerald-600 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                  <span className="relative z-10">{t('common.dashboard')}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </Link>
            )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-voluna-accent">
                  {stats ? stats.volunteers.toLocaleString() : '...'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('landing.hero.volunteers')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-voluna-accent">
                  {stats ? stats.organizations.toLocaleString() : '...'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('landing.hero.organizations')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-voluna-accent">
                  {stats ? stats.hoursDonated.toLocaleString() : '...'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('landing.hero.hoursDonated')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              {t('landing.features.title').replace('Voluna', '')} <span className="text-voluna-accent">Voluna</span>?
          </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

            <div className={`grid grid-cols-1 ${isHarkness ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-8`}>
            {/* Feature 1 */}
            <div className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100 dark:border-neutral-700">
              <div className="absolute inset-0 bg-gradient-to-br from-voluna-accent/5 to-emerald-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-voluna-accent to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {t('landing.features.trackImpact.title')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {t('landing.features.trackImpact.description')}
                </p>
                    </div>
                  </div>

            {/* Feature 2 */}
            <div className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100 dark:border-neutral-700">
              <div className="absolute inset-0 bg-gradient-to-br from-voluna-accent/5 to-emerald-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-voluna-accent to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {t('landing.features.connectLocal.title')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {t('landing.features.connectLocal.description')}
                </p>
              </div>
              </div>

            {/* Feature 3 */}
            <div className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100 dark:border-neutral-700">
              <div className="absolute inset-0 bg-gradient-to-br from-voluna-accent/5 to-emerald-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-voluna-accent to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {t('landing.features.findOpportunities.title')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {t('landing.features.findOpportunities.description')}
                </p>
              </div>
            </div>

            {/* Feature 4 - Senior Projects (only for Harkness users) */}
            {isHarkness && (
              <div className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100 dark:border-neutral-700">
                <div className="absolute inset-0 bg-gradient-to-br from-voluna-accent/5 to-emerald-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-voluna-accent to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {t('landing.features.seniorProjects.title')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                    {t('landing.features.seniorProjects.description')}
                  </p>
                  <Link
                    href={`/${locale}/senior-projects`}
                    className="inline-flex items-center text-voluna-accent hover:text-voluna-accent-hover font-semibold group-hover:translate-x-1 transition-transform duration-300"
                  >
                    {t('landing.features.seniorProjects.exploreProjects')}
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Testimonials Section - Hidden for now */}
      <div className="py-20 bg-gradient-to-br from-gray-50 to-white dark:from-neutral-800 dark:to-neutral-900 hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              What Our Community Says
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Real stories from volunteers and organizations making a difference together.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-voluna-accent to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">S</span>
                  </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Sarah Chen</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Volunteer</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 italic">
                "Voluna made it so easy to find meaningful volunteer opportunities in my area. The tracking system helps me see the real impact I'm making!"
              </p>
              </div>

            {/* Testimonial 2 */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-voluna-accent to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">M</span>
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Mike Rodriguez</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Organization Lead</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 italic">
                "The platform has revolutionized how we manage volunteers. We've seen a 300% increase in volunteer engagement since joining Voluna."
              </p>
                  </div>

            {/* Testimonial 3 */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-voluna-accent to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">A</span>
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Alex Johnson</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Community Leader</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 italic">
                "Voluna connects people who want to help with those who need it most. It's exactly what our community needed."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <footer className="bg-gradient-to-br from-gray-900 to-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Brand */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white">Voluna</h3>
              <p className="text-gray-400 leading-relaxed">
                {t('landing.footer.tagline')}
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-voluna-accent to-emerald-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">{t('landing.footer.quickLinks')}</h4>
              <div className="space-y-3">
                <Link href={`/${locale}/dashboard`} className="block text-gray-400 hover:text-white transition-colors">
                  {t('common.dashboard')}
                </Link>
                <Link href={`/${locale}/opportunities`} className="block text-gray-400 hover:text-white transition-colors">
                  {t('common.opportunities')}
                </Link>
                <Link href={`/${locale}/organizations`} className="block text-gray-400 hover:text-white transition-colors">
                  {t('common.organizations')}
                </Link>
                <Link href={`/${locale}/profile`} className="block text-gray-400 hover:text-white transition-colors">
                  Profile
                </Link>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">{t('landing.footer.contactUs')}</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-gradient-to-br from-voluna-accent to-emerald-600 rounded flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <a href={`mailto:${process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'baron@giggy.com'}`} className="text-gray-400 hover:text-white transition-colors">
                    {process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'baron@giggy.com'}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                {t('landing.footer.copyright')}
              </p>
              <p className="text-gray-400 text-sm mt-2 md:mt-0">
                {t('landing.footer.madeWith')}
              </p>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Geolocation Language Detection */}
      <GeolocationDetector />
      
      {/* Debug info - remove this later */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Current locale: {locale}
      </div>
    </main>
  );
}
