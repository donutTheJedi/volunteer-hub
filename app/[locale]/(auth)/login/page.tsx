// app/(auth)/login/page.tsx
'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useRouter } from "next/navigation";
import { useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function Login() {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace(`/${locale}`);
      }
    };
    
    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Use setTimeout to ensure the auth state is fully updated
        setTimeout(() => {
          router.replace(`/${locale}`);
        }, 100);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <main className="max-w-md mx-auto p-6">
      <Auth
        supabaseClient={supabase}
        providers={[]}           // social logins later
        appearance={{ theme: ThemeSupa }}
        theme="dark"
      />
      <div className="mt-4 text-center text-sm text-gray-600">
        <span>Don&apos;t have an account? </span>
        <Link href={`/${locale}/signup`} className="text-voluna-accent hover:text-voluna-accent-hover font-medium">Sign up</Link>
      </div>
    </main>
  );
}
