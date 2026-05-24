import type { Metadata } from "next";
import "../globals.css";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n.config";
import { getTranslations, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lodgra.pt'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  try {
    const t = await getTranslations({ locale, namespace: 'common' });
    return {
      metadataBase: new URL(APP_URL),
      title: t('appName'),
      robots: { index: false, follow: false },
    };
  } catch {
    return {
      metadataBase: new URL(APP_URL),
      title: 'Lodgra',
      robots: { index: false, follow: false },
    };
  }
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  let messages = {};
  try {
    messages = await getMessages();
  } catch (error) {
    console.warn(`[Layout] getMessages() failed for ${locale}:`, error);
    messages = {};
  }

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
