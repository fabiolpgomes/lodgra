import type { Metadata } from "next";
import { locales } from "@/i18n.config";

export const metadata: Metadata = {
  title: 'Lodgra',
  robots: { index: false, follow: false },
};

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
