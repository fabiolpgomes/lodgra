import { redirect } from 'next/navigation'
import { getAuth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { OptimizationDashboard } from '@/components/features/admin/OptimizationDashboard'

export const metadata = {
  title: 'Optimization Tools | Lodgra Admin',
  description: 'AI recommendations to improve property ranking and bookings',
}

export default async function OptimizationPage() {
  const headersList = await headers()
  const { userId } = await getAuth({ headers: headersList })

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
      <OptimizationDashboard properties={properties || []} />
    </div>
  )
}
