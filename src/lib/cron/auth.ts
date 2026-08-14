import type { NextRequest } from 'next/server'

/**
 * Validates internal cron requests without exposing credentials in URLs.
 * Vercel Cron, manual triggers and Supabase pg_cron all use this Bearer contract.
 */
export function isAuthorizedCronRequest(
  request: NextRequest,
  secret = process.env.CRON_SECRET
): boolean {
  if (!secret) return false

  return request.headers.get('authorization') === `Bearer ${secret}`
}
