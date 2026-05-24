/* eslint-disable @typescript-eslint/no-require-imports */
const { withSentryConfig } = require("@sentry/nextjs");
const withBundleAnalyzer = require('@next/bundle-analyzer');

// next-intl plugin removed - managing i18n via middleware instead
// [locale] routes are not compiling with the plugin enabled

const nextConfig = {
  // Remove X-Powered-By header (minor security + bandwidth gain)
  poweredByHeader: false,

  // Permanent redirect: homestay.pt → lodgra.io (host-based, path-preserving)
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'homestay.pt' }],
        destination: 'https://lodgra.io/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.homestay.pt' }],
        destination: 'https://lodgra.io/:path*',
        permanent: true,
      },
    ]
  },

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
})(nextConfig);

// TESTING: Disable Sentry temporarily to debug routing issue
// const finalConfig = withSentryConfig(analyzedConfig, {
//   org: "home-stay",
//   project: "javascript-nextjs-homestay",
//   silent: !process.env.CI,
//   tunnelRoute: "/monitoring",
//   webpack: {
//     automaticVercelMonitors: true,
//     treeshake: {
//       removeDebugLogging: true,
//     },
//   },
// });

module.exports = analyzedConfig
