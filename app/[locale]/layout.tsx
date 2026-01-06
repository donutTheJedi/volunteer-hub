import Header from '@/components/header';
import { AuthProvider } from '@/lib/auth-context';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
    </NextIntlClientProvider>
  );
}
