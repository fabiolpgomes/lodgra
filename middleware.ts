import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { applySecurityHeaders } from './src/lib/middleware/security-headers'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Generate nonce for this request
  const nonce = Buffer.from(randomUUID()).toString('base64')

  // Store nonce in response header for use by pages/components
  response.headers.set('x-nonce', nonce)

  // Apply security headers with nonce
  return applySecurityHeaders(response, nonce)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.gif).*)',
  ],
}
