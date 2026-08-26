import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseCookieOptions } from './cookie-options'

export function createClient() {
  const cookieOptions =
    typeof window !== 'undefined'
      ? getSupabaseCookieOptions(window.location.hostname)
      : undefined

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions }
  )
}
