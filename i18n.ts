import {getRequestConfig} from 'next-intl/server';
 
// Can be imported from a shared config
export const locales = ['en', 'es', 'pt'] as const;
export const defaultLocale = 'es' as const;
 
export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    // Return default locale instead of calling notFound() in root layout
    return {
      locale: defaultLocale,
      messages: (await import(`./messages/${defaultLocale}.json`)).default
    };
  }
 
  return {
    locale: locale as string,
    messages: (await import(`./messages/${locale}.json`)).default
  };
}); 