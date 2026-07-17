import { requireRole } from '@/lib/auth/requireRole'
import { redirect } from 'next/navigation'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PremiumCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'
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

  let orgPlan: Plan = 'essencial'
  let orgStatus = 'active'
  if (role === 'admin' && auth.organizationId) {
    const { data: org } = await adminClient
      .from('organizations')
      .select('subscription_plan, subscription_status')
      .eq('id', auth.organizationId)
      .single()
    if (org) {
      orgPlan = (org.subscription_plan as Plan) ?? 'essencial'
      orgStatus = org.subscription_status ?? 'active'
    }
  }

  return (
    <AuthLayout>
      <PremiumPageShell maxWidth="max-w-lg">
        <PremiumPageHeader
          title="Minha Conta"
          description="Gerencie as suas informações pessoais"
          badge={roleLabel}
          icon={User}
        />

        {/* Profile Info */}
        <PremiumCard>
          <h2 className="mb-4 text-sm font-semibold text-brand-text-dark transition-colors group-hover:text-brand-gold">Informações do Perfil</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-brand-text-medium">Nome</p>
              <p className="text-sm font-medium text-brand-text-dark">{profile?.full_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-brand-text-medium">Email</p>
              <p className="text-sm font-medium text-brand-text-dark">{profile?.email}</p>
            </div>
            <div>
              <p className="text-xs text-brand-text-medium">Função</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                role === 'admin' ? 'bg-red-100 text-red-800' :
                role === 'gestor' ? 'bg-brand-blue/10 text-brand-blue' :
                'bg-gray-100 text-gray-800'
              }`}>
                {roleLabel}
              </span>
            </div>
          </div>
        </PremiumCard>

        {/* Plan Management — admin only */}
        {role === 'admin' && (
          <PremiumCard>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-4 w-4 text-brand-gold" />
              <h2 className="text-sm font-semibold text-brand-text-dark transition-colors group-hover:text-brand-gold">Plano e Subscrição</h2>
            </div>
            <PlanManagement currentPlan={orgPlan} subscriptionStatus={orgStatus} />
          </PremiumCard>
        )}

        {/* Change Password */}
        <PremiumCard>
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="h-4 w-4 text-brand-gold" />
            <h2 className="text-sm font-semibold text-brand-text-dark transition-colors group-hover:text-brand-gold">Alterar Senha</h2>
          </div>
          <ChangePasswordForm />
        </PremiumCard>
      </PremiumPageShell>
    </AuthLayout>
  )
}
