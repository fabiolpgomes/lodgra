export const dynamic = 'force-dynamic'

import type { Metadata } from "next";
import "../globals.css";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n.config";
import { getTranslations, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lodgra.pt'

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });

  return {
    metadataBase: new URL(APP_URL),
    title: t('appName'),
    robots: { index: false, follow: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  console.error(`[Layout] Starting for locale: ${locale}`);

  let messages;
  try {
    messages = await getMessages();
    console.error(`[Layout] getMessages() succeeded, keys: ${Object.keys(messages || {}).join(', ')}`);
  } catch (error) {
    console.error(`[Layout] getMessages() failed:`, error);
    throw error;
  }

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    console.error(`[Layout] Locale not found in allowed locales. Got: ${locale}, allowed: ${locales.join(', ')}`);
    notFound();
  }

  console.error(`[Layout] Locale validation passed for: ${locale}`);

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
