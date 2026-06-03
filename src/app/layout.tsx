import type { Metadata, Viewport } from "next";
import { Poppins, Inter, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import "@/styles/tokens.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/common/ui/sonner";
import { CookieBanner } from "@/components/common/ui/CookieBanner";
import { GoogleAnalytics } from "@/components/features/analytics/GoogleAnalytics";
import { ServiceWorkerRegister } from "@/components/common/pwa/ServiceWorkerRegister";
import { generateWebsiteJsonLd } from "@/lib/seo/jsonld";
import { getTenantGAId } from "@/lib/analytics/server";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "700", "800", "900"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E3A8A",
};

// Index enabled for public pages — private pages can override via generateMetadata
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'),
  title: 'Lodgra',
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lodgra',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'icon', url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { rel: 'icon', url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Lodgra',
  url: APP_URL,
  logo: `${APP_URL}/icons/icon-512x512.png`,
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
  const tenantGAId = await getTenantGAId();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
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
          suppressHydrationWarning
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(generateWebsiteJsonLd()) }}
          suppressHydrationWarning
        />
      </head>
      <body
        className={`${poppins.variable} ${inter.variable} ${hankenGrotesk.variable} font-inter antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster richColors position="top-right" />
          <CookieBanner />
          <GoogleAnalytics gaId={tenantGAId} />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
