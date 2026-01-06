import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { detectUserLanguage } from './lib/geolocation';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Only refresh session on protected routes or when needed
  const { pathname } = req.nextUrl;
  
  // Routes that require authentication (check with locale prefix)
  const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/my-hours',
    '/new-org'
  ];
  
  // Check if current route is protected (account for locale prefixes)
  const isProtectedRoute = protectedRoutes.some(route => {
    // Check both with and without locale prefix
    const localePattern = new RegExp(`^/(${locales.join('|')})?${route}`);
    return localePattern.test(pathname);
  });
  
  if (isProtectedRoute) {
    // Refresh session for protected routes
    await supabase.auth.getSession();
  }
  
  // Handle geolocation-based language detection for root path
  if (pathname === '/') {
    try {
      const detectedLanguage = await detectUserLanguage();
      const url = req.nextUrl.clone();
      url.pathname = `/${detectedLanguage}`;
      return NextResponse.redirect(url);
    } catch (error) {
      console.warn('Failed to detect language from geolocation:', error);
      // Fallback to default locale
      const url = req.nextUrl.clone();
      url.pathname = `/${defaultLocale}`;
      return NextResponse.redirect(url);
    }
  }
  
  // Handle internationalization
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};