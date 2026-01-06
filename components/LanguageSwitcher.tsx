'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales, defaultLocale } from '@/i18n';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  const handleLanguageChange = async (newLocale: string) => {
    // Get the current path segments
    const pathSegments = pathname.split('/').filter(Boolean);
    
    // Check if the first segment is a locale
    const isFirstSegmentLocale = locales.includes(pathSegments[0] as any);
    
    // Get the path without locale
    const pathWithoutLocale = isFirstSegmentLocale 
      ? '/' + pathSegments.slice(1).join('/')
      : pathname;
    
    // Update user's language preference in profile if logged in
    if (userId) {
      try {
        await supabase
          .from('user_profiles')
          .update({ language: newLocale })
          .eq('user_id', userId);
      } catch (error) {
        console.error('Error updating user language preference:', error);
      }
    }
    
    // Navigate to the new locale (all locales now have prefixes)
    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  return (
    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
      <select
        value={locale}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="px-2 py-1 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-voluna-accent focus:border-voluna-accent"
      >
        <option value="en">🇺🇸 English</option>
        <option value="es">🇪🇸 Español</option>
        <option value="pt">🇧🇷 Português</option>
      </select>
    </div>
  );
} 