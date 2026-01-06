/**
 * Admin and test account configuration
 * These values can be overridden via environment variables
 * 
 * For server-side: Use ADMIN_EMAIL and TEST_ACCOUNT_EMAIL
 * For client-side: Use NEXT_PUBLIC_ADMIN_EMAIL and NEXT_PUBLIC_TEST_ACCOUNT_EMAIL
 */

// Server-side (default) or client-side (NEXT_PUBLIC_)
const getAdminEmail = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_ prefix
    return process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'baron@giggy.com';
  }
  // Server-side: use regular env var
  return process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'baron@giggy.com';
};

const getTestAccountEmail = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_ prefix
    return process.env.NEXT_PUBLIC_TEST_ACCOUNT_EMAIL || 'twitchemail6975@gmail.com';
  }
  // Server-side: use regular env var
  return process.env.TEST_ACCOUNT_EMAIL || process.env.NEXT_PUBLIC_TEST_ACCOUNT_EMAIL || 'twitchemail6975@gmail.com';
};

export const ADMIN_EMAIL = getAdminEmail();
export const TEST_ACCOUNT_EMAIL = getTestAccountEmail();

/**
 * Check if an email belongs to the admin
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Check if an email belongs to the test account
 */
export function isTestAccountEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === TEST_ACCOUNT_EMAIL.toLowerCase();
}

