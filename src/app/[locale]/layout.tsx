import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Lodgra',
  robots: { index: false, follow: false },
};

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
