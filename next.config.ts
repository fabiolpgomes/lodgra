import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from 'next-intl/plugin';
import withBundleAnalyzer from '@next/bundle-analyzer';

// Configure next-intl without aggressive routing redirects
// Root path (/) is NOT redirected - landing page works without locale
const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  // Remove X-Powered-By header (minor security + bandwidth gain)
  poweredByHeader: false,

  // Optimise images: serve WebP/AVIF automatically
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "brjumbfpvijrkhrherpt.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "wrqjpyyopwgyqluqkcga.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // Compress responses (gzip/brotli) — improves LCP on text resources
  compress: true,
};

const analyzedConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(withNextIntl(nextConfig));

const finalConfig = withSentryConfig(analyzedConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "home-stay",

  project: "javascript-nextjs-homestay",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});

// Turbopack workaround: attach hook AFTER all wrappers so it isn't overridden.
// Turbopack (Next.js 16 default) doesn't generate middleware.js.nft.json but
// Vercel CLI 51+ reads it during build finalization. runAfterProductionCompile
// runs between compilation and finalization — exactly when the file is needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sentryHook = (finalConfig as any).runAfterProductionCompile
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(finalConfig as any).runAfterProductionCompile = async (params: { distDir: string }) => {
  const { join } = await import('path')
  const { existsSync, writeFileSync } = await import('fs')
  const nftPath = join(params.distDir, 'server', 'middleware.js.nft.json')
  if (!existsSync(nftPath)) {
    writeFileSync(nftPath, JSON.stringify({ version: 1, files: [] }))
    console.log('[build] Created middleware.js.nft.json (Turbopack workaround)')
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (sentryHook) await (sentryHook as any)(params)
}

export default finalConfig
