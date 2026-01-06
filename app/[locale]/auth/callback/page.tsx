"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLocale } from "next-intl";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const locale = useLocale();

  useEffect(() => {
    async function handleCallback() {
      try {
        const code = params.get("code");
        let err: { message: string } | null = null;

        if (code) {
          // Code query param flow (email confirm PKCE)
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          err = error;
        } else if (typeof window !== 'undefined' && window.location.hash) {
          // Hash fragment flow (?/#access_token=...&refresh_token=...)
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');
          const error_description = hashParams.get('error_description');
          if (error_description) {
            setError(error_description);
            setProcessing(false);
            return;
          }
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            err = error;
          } else {
            setError("Missing verification parameters in URL");
            setProcessing(false);
            return;
          }
        }

        if (err) {
          setError(err.message);
          setProcessing(false);
          return;
        }

        // Wait a moment for the profile creation trigger to complete
        setTimeout(async () => {
          // Check if user has a complete profile
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('institution')
              .eq('user_id', authUser.id)
              .maybeSingle();
            
            // If no profile or no institution, redirect to profile completion
            if (!profile || !profile.institution) {
              // Get institution from auth metadata to prefill the form
              const institution = authUser.user_metadata?.institution || '';
              const redirectUrl = institution 
                ? `/${locale}/profile?onboarding=1&institution=${encodeURIComponent(institution)}`
                : `/${locale}/profile?onboarding=1`;
              
              // Use window.location.replace to avoid opening new tabs
              window.location.replace(redirectUrl);
            } else {
              window.location.replace(`/${locale}`);
            }
          } else {
            window.location.replace(`/${locale}`);
          }
        }, 1000);
      } catch (e: any) {
        setError(e?.message || "Failed to complete verification");
      } finally {
        setProcessing(false);
      }
    }

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold text-voluna-primary mb-2">{processing ? "Completing sign in..." : error ? "Verification error" : "Success"}</h1>
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <p className="text-gray-600">Please wait while we sign you in...</p>
      )}
    </main>
  );
}


