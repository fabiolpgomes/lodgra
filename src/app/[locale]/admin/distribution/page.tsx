import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { MultiPlatformDashboard } from '@/components/features/admin/MultiPlatformDashboard'

export const metadata = {
  title: 'Multi-Platform Distribution | Lodgra Admin',
  description: 'Compare performance across Google, Airbnb, Booking, VRBO, and Flatio',
}

export default async function DistributionPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/login')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { persistSession: false } }
  )

  // Verify user is admin/manager
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', userId)
    .single()

  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'manager')) {
    redirect('/dashboard')
  }

  // Fetch organization properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')
    .eq('organization_id', userProfile.organization_id)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-8">
      <MultiPlatformDashboard properties={properties || []} />
    </div>
  )
}
