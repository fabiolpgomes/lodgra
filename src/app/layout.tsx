import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "@/styles/tokens.css";
import "@/styles/design-tokens.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/common/ui/sonner";
import { CookieBanner } from "@/components/common/ui/CookieBanner";
import { GoogleAnalytics } from "@/components/features/analytics/GoogleAnalytics";
import { ServiceWorkerRegister } from "@/components/common/pwa/ServiceWorkerRegister";
import { generateWebsiteJsonLd } from "@/lib/seo/jsonld";

const poppins = localFont({
  src: "./fonts/poppins-bold-latin.woff2",
  variable: "--font-poppins",
  weight: "700",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

const hankenGrotesk = localFont({
  src: "./fonts/hanken-grotesk-latin.woff2",
  variable: "--font-hanken-grotesk",
  weight: "300 900",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10203E",
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
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* next/font/local serve fontes versionadas sem dependências externas */}
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
          <GoogleAnalytics gaId={null} />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
