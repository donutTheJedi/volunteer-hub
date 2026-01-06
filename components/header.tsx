'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import LoadingSpinner from './loading-spinner';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslations, useLocale } from 'next-intl';

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const [fullName, setFullName] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations();
  const locale = useLocale();

  // State for CTA decisioning
  const [ctaLoading, setCtaLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [ownedOrgs, setOwnedOrgs] = useState<{ id: string }[]>([]);
  const [isHarkness, setIsHarkness] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const getProfile = async () => {
      if (user?.id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();
        setFullName(profile?.full_name ?? null);
      } else {
        setFullName(null);
      }
    };
    
    getProfile();
  }, [user]);

  // Load state for CTA - simplified to prevent race conditions
  useEffect(() => {
    let isActive = true;
    let retryTimeout: NodeJS.Timeout;
    
    const loadState = async (retryCount = 0) => {
      if (!user?.id) {
        setHasProfile(null);
        setOwnedOrgs([]);
        setIsHarkness(false);
        setCtaLoading(false);
        return;
      }
      
      // Only show loading on initial load, not on retries
      if (retryCount === 0) {
        setCtaLoading(true);
      }
      
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
        
        // If profile doesn't exist yet and this is a new user, retry after a short delay
        if (!profile && retryCount < 3) {
          retryTimeout = setTimeout(() => {
            if (isActive) loadState(retryCount + 1);
          }, 1000 * (retryCount + 1)); // 1s, 2s, 3s
          return;
        }
        
        setHasProfile(!!profile);
        setOwnedOrgs(orgs ?? []);
        
        // Check institution from profile
        const inst = (profile?.institution || '').toLowerCase();
        const isHarknessFromProfile = inst === 'harkness institute';
        setIsHarkness(isHarknessFromProfile);
        
      } catch (error) {
        console.error('Error loading header state:', error);
        if (isActive) {
          setHasProfile(false);
          setOwnedOrgs([]);
          setIsHarkness(false);
        }
      } finally {
        if (isActive) setCtaLoading(false);
      }
    };
    
    loadState();
    return () => {
      isActive = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [user?.id]);

  // Listen for profile completion events
  useEffect(() => {
    const handleProfileCompleted = (event: CustomEvent) => {
      const { institution } = event.detail;
      if (institution && institution.toLowerCase() === 'harkness institute') {
        setIsHarkness(true);
      }
      // Also update profile status when profile is completed
      setHasProfile(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('profileCompleted', handleProfileCompleted as EventListener);
      return () => {
        window.removeEventListener('profileCompleted', handleProfileCompleted as EventListener);
      };
    }
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Don't close if clicking inside the header or menu
      if (target.closest('header')) {
        return;
      }
      setMobileMenuOpen(false);
    };

    if (mobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [mobileMenuOpen]);

  // Set mounted to true after component mounts (for SSR)
  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      alert('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmText: deleteConfirmText,
          password: deletePassword || undefined
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }

      // Account deleted successfully, sign out and redirect
      await signOut();
      window.location.href = '/';
      
    } catch (err: any) {
      console.error('Delete account error:', err);
      alert(err.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <header className="sticky top-0 z-20 w-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between py-4 px-6">
          <Link href={`/${locale}`} className="flex items-center font-extrabold text-xl sm:text-2xl text-voluna-primary">
            <Image src="/logo.png" alt="Voluna Logo" width={120} height={28} className="w-30 h-7" priority />
          </Link>
          <div className="flex gap-2 sm:gap-4 font-medium text-sm sm:text-base">
            <div className="px-3 py-1 text-gray-400">{t('common.loading')}</div>
          </div>
          <div className="flex items-center gap-3">
            <LoadingSpinner size="small" message="" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20 w-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between py-4 px-6">
        {/* Logo/Brand */}
        <Link href={`/${locale}`} className="flex items-center font-extrabold text-xl sm:text-2xl text-voluna-primary hover:opacity-80 transition">
          <Image src="/logo.png" alt="Voluna Logo" width={120} height={28} className="w-30 h-7" priority />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-4 lg:gap-6 font-medium text-base">
          <Link href={`/${locale}`} className="px-4 py-2 rounded-lg hover:bg-voluna-background dark:hover:bg-neutral-800 transition">{t('common.home')}</Link>
          <Link href={`/${locale}/organizations`} className="px-4 py-2 rounded-lg hover:bg-voluna-background dark:hover:bg-neutral-800 transition">{t('common.organizations')}</Link>
          <Link href={`/${locale}/opportunities`} className="px-4 py-2 rounded-lg hover:bg-voluna-background dark:hover:bg-neutral-800 transition">{t('common.opportunities')}</Link>
          {user && isHarkness && (
            <Link href={`/${locale}/senior-projects`} className="px-4 py-2 rounded-lg hover:bg-voluna-background dark:hover:bg-neutral-800 transition">Senior Project</Link>
          )}
        </nav>

        {/* Desktop CTA based on state */}
        <div className="hidden md:flex items-center gap-2">
          {!user ? (
            <>
              <Link
                href={`/${locale}/login`}
                className="px-4 py-2 rounded-lg border border-voluna-accent text-voluna-accent font-semibold hover:bg-voluna-background"
              >
                {t('common.login')}
              </Link>
              <Link
                href={`/${locale}/signup`}
                className="px-4 py-2 rounded-lg bg-voluna-accent text-white font-semibold hover:bg-voluna-accent-hover"
              >
                {t('auth.createAccountButton')}
              </Link>
            </>
          ) : ctaLoading || hasProfile === null ? (
            <div className="h-9 w-36 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse" />
          ) : hasProfile === false ? (
            <>
              <Link
                href={`/${locale}/dashboard`}
                className="px-4 py-2 rounded-lg border border-voluna-accent text-voluna-accent font-semibold hover:bg-voluna-background"
              >
                {t('common.dashboard')}
              </Link>
              <Link
                href={`/${locale}/profile?onboarding=1`}
                className="px-4 py-2 rounded-lg bg-voluna-accent text-white font-semibold hover:bg-voluna-accent-hover"
              >
                {t('profile.completeProfile')}
              </Link>
            </>
          ) : (
            <Link
              href={`/${locale}/dashboard`}
              className="px-4 py-2 rounded-lg bg-voluna-accent text-white font-semibold hover:bg-voluna-accent-hover"
            >
              {t('common.dashboard')}
            </Link>
          )}
        </div>

        {/* Hamburger Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMobileMenuOpen(!mobileMenuOpen);
          }}
          className="p-2 rounded-lg text-gray-800 dark:text-gray-100 hover:bg-voluna-background dark:hover:bg-neutral-800 transition"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Navigation (shown when hamburger is open) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur text-gray-800 dark:text-gray-100">
          <div className="px-6 py-4 space-y-3">
            <Link 
              href={`/${locale}`} 
              className="block px-3 py-2 rounded-lg hover:bg-voluna-background dark:hover:bg-neutral-800 transition font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('common.home')}
            </Link>
            <Link 
              href={`/${locale}/organizations`} 
              className="block px-3 py-2 rounded-lg hover:bg-voluna-background dark:hover:bg-neutral-800 transition font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('common.organizations')}
            </Link>
            <Link 
              href={`/${locale}/opportunities`} 
              className="block px-3 py-2 rounded-lg hover:bg-voluna-background dark:hover:bg-neutral-800 transition font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('common.opportunities')}
            </Link>
            {user && isHarkness && (
              <Link 
                href={`/${locale}/senior-projects`} 
                className="block px-3 py-2 rounded-lg hover:bg-voluna-background dark:hover:bg-neutral-800 transition font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Senior Project
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Hamburger Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur text-gray-800 dark:text-gray-100">
          <div className="px-6 py-4 space-y-4">
            {/* User Account */}
            <div>
              {user ? (
                <div className="space-y-2">
                  <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    {fullName || user.email}
                  </div>
                  <Link
                    href={`/${locale}/profile`}
                    className="block px-3 py-2 rounded-lg hover:bg-voluna-background dark:hover:bg-neutral-800 transition font-medium text-voluna-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('common.profile')}
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded-lg hover:bg-voluna-background dark:hover:bg-neutral-800 transition font-medium text-voluna-primary"
                  >
                    {t('common.logout')}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(true);
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium text-red-600 dark:text-red-400"
                  >
                    {t('profile.deleteAccount')}
                  </button>
                </div>
              ) : (
                <Link
                  href={`/${locale}/login`}
                  className="block px-3 py-2 rounded-lg hover:bg-voluna-background dark:hover:bg-neutral-800 transition font-medium text-voluna-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('common.login')}
                </Link>
              )}
            </div>

            {/* Language Switcher */}
            <div className="border-t border-gray-200 dark:border-neutral-800 pt-3">
              <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 font-medium">Language</div>
              <div className="px-3 py-2">
                <LanguageSwitcher />
              </div>
              <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400">({locale})</div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal - Portal to body */}
      {showDeleteModal && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4" 
          style={{ 
            zIndex: 999999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false);
              setDeleteConfirmText('');
              setDeletePassword('');
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
              {t('profile.deleteAccount')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('profile.deleteAccountModalWarning')}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.deleteAccountConfirmation')}
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="DELETE MY ACCOUNT"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.enterPasswordToConfirm')}
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Your password"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeletePassword('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                disabled={deleting}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE MY ACCOUNT'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? t('profile.deletingAccount') : t('profile.deleteAccount')}
              </button>
            </div>
          </div>
        </div>,
        document.documentElement
      )}
    </header>
  );
}
