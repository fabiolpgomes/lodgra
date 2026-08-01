import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { GooglePerformanceDashboard } from '@/components/features/admin/GooglePerformanceDashboard'

export const metadata = {
  title: 'Google Performance Dashboard | Lodgra Admin',
  description: 'View performance metrics from Google Vacation Rentals',
}

export default async function GooglePerformancePage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/login')
  }

  // Verify user is admin
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
      auth: { persistSession: false },
    }
  )

  const { data: userProfile, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'manager')) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-8">
      <GooglePerformanceDashboard />
    </div>
  )
}
