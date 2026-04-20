import { NextResponse } from 'next/server'

export function applySecurityHeaders(response: NextResponse, nonce?: string): NextResponse {
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")'
  )

  // CSP with nonce for inline scripts (Google Analytics, JSON-LD)
  const scriptNonce = nonce ? `'nonce-${nonce}'` : ''
  const isDev = process.env.NODE_ENV === 'development'
  const evalDirective = isDev ? "'unsafe-eval'" : ''
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self' ${scriptNonce} ${evalDirective} https://www.googletagmanager.com https://js.stripe.com https://*.sentry.io https://cdnjs.cloudflare.com`.trim(),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://region1.google-analytics.com https://js.stripe.com https://api.stripe.com https://*.sentry.io https://*.ingest.sentry.io https://cdnjs.cloudflare.com",
      "font-src 'self' data:",
      "worker-src 'self' blob:",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://www.google.com https://maps.google.com",
      "frame-ancestors 'none'",
    ].join('; ')
  )
  return response
}
