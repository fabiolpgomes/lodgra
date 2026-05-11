// Sentry client initialization is handled by src/instrumentation-client.ts
// (Next.js 15 instrumentation API). Do not call Sentry.init() here to avoid
// double initialization — withSentryConfig injects this file AND Next.js loads
// instrumentation-client.ts, so having Sentry.init() in both causes the warning.
