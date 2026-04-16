import { redirect } from 'next/navigation'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { createClient } from '@/lib/supabase/server'
import { ComplianceDashboard } from '@/components/admin/ComplianceDashboard'
import { Shield } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CompliancePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  return (
    <AuthLayout>
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Compliance Dashboard</h1>
            <p className="text-sm text-gray-500">RGPD / LGPD — Estado de consentimentos e pedidos de eliminação</p>
          </div>
        </div>

        <ComplianceDashboard />
      </div>
    </AuthLayout>
  )
}
