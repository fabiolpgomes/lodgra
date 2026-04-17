import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // evita FOIT — melhora CLS
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1E3A8A",
};

// Noindex por defeito — páginas públicas fazem override via generateMetadata
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.lodgra.pt'),
  title: 'Lodgra',
  robots: { index: false, follow: false },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lodgra',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/apple-touch-icon.png',
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lodgra.pt'

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Lodgra',
  url: APP_URL,
  logo: `${APP_URL}/opengraph-image`,
  description: 'Plataforma global de gestão de alojamentos locais para anfitriões no Airbnb e Booking.com.',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'support@lodgra.io',
    contactType: 'customer support',
    availableLanguage: ['Portuguese', 'English', 'Spanish'],
  },
  areaServed: ['PT', 'BR', 'US', 'ES'],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        {/* next/font self-hosta Geist — não precisa de preconnect para Google Fonts */}
        {/* Preconnect para Stripe (checkout na landing) — reduz latência em 50-200ms */}
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://api.stripe.com" />
        {/* Supabase — usado em todas as páginas autenticadas */}
        <link rel="dns-prefetch" href="https://pxmcsdqfcwutywrzuoal.supabase.co" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Toaster richColors position="top-right" />
        <CookieBanner />
        <GoogleAnalytics nonce={nonce} />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
