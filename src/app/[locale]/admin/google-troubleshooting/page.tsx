import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { TroubleshootingDashboard } from '@/components/features/admin/TroubleshootingDashboard'

export const metadata = {
  title: 'Google Troubleshooting | Lodgra Admin',
  description: 'Diagnose and fix Google Vacation Rentals indexation issues',
}

export default async function TroubleshootingPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/login')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
      auth: { persistSession: false },
    }
  )

  // Verify user is admin/manager
  const { data: userProfile, error: userError } = await supabase
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', userId)
    .single()

  if (userError || !userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'manager')) {
    redirect('/dashboard')
  }

  // Fetch organization properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, organization_id')
    .eq('organization_id', userProfile.organization_id)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-8">
      <TroubleshootingDashboard properties={properties || []} />
    </div>
  )
}
