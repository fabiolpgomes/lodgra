import { requireRole } from '@/lib/auth/requireRole'
import { redirect } from 'next/navigation'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { PlanManagement } from '@/components/billing/PlanManagement'
import { KeyRound, User, CreditCard } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { Plan } from '@/lib/billing/plans'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const auth = await requireRole(['admin', 'gestor', 'viewer'])
  if (!auth.authorized) redirect('/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('email, full_name, role')
    .eq('id', auth.userId!)
    .single()

  const role = auth.role ?? profile?.role ?? 'viewer'

  const roleLabel = {
    admin: 'Administrador',
    gestor: 'Gestor',
    viewer: 'Visualizador',
    guest: 'Convidado',
  }[role as 'admin' | 'gestor' | 'viewer' | 'guest']

  let orgPlan: Plan = 'starter'
  let orgStatus = 'active'
  if (role === 'admin' && auth.organizationId) {
    const { data: org } = await adminClient
      .from('organizations')
      .select('subscription_plan, subscription_status')
      .eq('id', auth.organizationId)
      .single()
    if (org) {
      orgPlan = (org.subscription_plan as Plan) ?? 'starter'
      orgStatus = org.subscription_status ?? 'active'
    }
  }

  return (
    <AuthLayout>
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Minha Conta</h1>
            <p className="text-sm text-gray-500">Gerencie as suas informações pessoais</p>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Informações do Perfil</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Nome</p>
              <p className="text-sm font-medium text-gray-900">{profile?.full_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{profile?.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Função</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                role === 'admin' ? 'bg-red-100 text-red-800' :
                role === 'gestor' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Plan Management — admin only */}
        {role === 'admin' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-4 w-4 text-gray-600" />
              <h2 className="text-sm font-semibold text-gray-900">Plano e Subscrição</h2>
            </div>
            <PlanManagement currentPlan={orgPlan} subscriptionStatus={orgStatus} />
          </div>
        )}

        {/* Change Password */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="h-4 w-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-900">Alterar Senha</h2>
          </div>
          <ChangePasswordForm />
        </div>
      </div>
    </AuthLayout>
  )
}
