import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { getSupabaseCookieOptions } from './cookie-options'

export async function createClient() {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const hostname = headerStore.get('x-forwarded-host') || headerStore.get('host')
  const cookieOptions = getSupabaseCookieOptions(hostname)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(10000),
          })
        },
      },
    }
  )
}
