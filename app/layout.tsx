import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { defaultLocale } from '@/i18n';
import { ThemeProvider } from '@/lib/theme-context';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Voluna - Volunteer Hub",
  description: "Connect with organizations and discover volunteer opportunities",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
} 