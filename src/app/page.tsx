import { LandingPage } from '@/components/landing/LandingPage'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = await createClient()

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()

  // If authenticated, redirect to dashboard or calendar (which will do role-based redirect to locale version)
  if (user) {
    console.log(`[RootPage] User authenticated: ${user.email}, redirecting to /dashboard`)
    // Redirect to /dashboard which will check role and redirect to /pt/dashboard or /pt/calendar
    redirect('/dashboard')
  }

  // If not authenticated, show landing page
  return <LandingPage />
}
