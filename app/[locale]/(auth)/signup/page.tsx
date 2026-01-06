"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTranslations, useLocale } from "next-intl";
import InstitutionSelect from "@/components/InstitutionSelect";

export default function SignUp() {
  const t = useTranslations();
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [verifyPending, setVerifyPending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.replace(`/${locale}`);
      }
    }
    checkAuth();
  }, [router, locale]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      setLoading(false);
      return;
    }
    
    try {
      // 1. Create the auth account
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/${locale}/auth/callback` : undefined;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName,
            phone: phone,
            institution: institution,
          },
        },
      });
      
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      
      // 2. If signup successful, show verify screen (profile will be created by DB trigger)
      if (authData.user) {
        setVerifyPending(true);
      } else {
        setError("Account creation failed - please try again");
      }
    } catch (err) {
      setError("Unexpected error during signup");
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setError("");
    setResent(false);
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/${locale}/auth/callback` : undefined;
      await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo } });
      setResent(true);
    } catch {
      setError('Failed to resend verification email');
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      {!verifyPending ? (
        <>
          <h1 className="text-2xl font-bold text-voluna-primary mb-2">{t('auth.joinVoluna')}</h1>
          <p className="text-gray-600 mb-6">{t('auth.createAccount')}</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.fullName')}</label>
          <input
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-voluna-accent focus:border-voluna-accent"
            type="text"
            placeholder={t('auth.fullName')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
          <input
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-voluna-accent focus:border-voluna-accent"
            type="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.phone')}</label>
          <input
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-voluna-accent focus:border-voluna-accent"
            type="tel"
            placeholder={t('auth.phone')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        
        <InstitutionSelect
          label={t('auth.institution')}
          placeholder={t('profile.enterInstitution')}
          value={institution}
          onChange={setInstitution}
          allowAddNew={false}
          required
        />
        
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
          <input
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-voluna-accent focus:border-voluna-accent pr-10"
            type={showPassword ? 'text' : 'password'}
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.confirmPassword')}</label>
          <input
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-voluna-accent focus:border-voluna-accent pr-10"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder={t('auth.confirmPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            onClick={() => setShowConfirmPassword(v => !v)}
            aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          >
            {showConfirmPassword ? '🙈' : '👁️'}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        <button
          type="submit"
          className="bg-voluna-accent text-voluna-text-light px-4 py-3 rounded-lg w-full font-semibold hover:bg-voluna-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
          disabled={loading}
        >
          {loading ? t('auth.creatingAccount') : t('auth.createAccountButton')}
        </button>
        
        <div className="text-center mt-4">
          <p className="text-gray-600 text-sm">
            {t('auth.alreadyHaveAccount')}{" "}
            <Link href={`/${locale}/login`} className="text-voluna-accent hover:text-voluna-accent-hover font-medium">
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-voluna-primary mb-2">{t('auth.verifyEmail')}</h1>
          <p className="text-gray-600 mb-6">{t('auth.verifyEmailMessage')}</p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          <div className="space-y-3">
            <button
              onClick={resendVerification}
              className="bg-voluna-accent text-voluna-text-light px-4 py-3 rounded-lg w-full font-semibold hover:bg-voluna-accent-hover transition"
            >
              {t('auth.resendVerification')}
            </button>
            {resent && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-700 text-sm">{t('auth.verificationEmailSent')}</p>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
} 