import { requireRole } from '@/lib/auth/requireRole'
import { redirect } from 'next/navigation'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PremiumCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'
import { createAdminClient } from '@/lib/supabase/admin'
import { CreditCard } from 'lucide-react'
import { PlanManagement } from '@/components/billing/PlanManagement'
import { Plan } from '@/lib/billing/plans'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) redirect('/login')

  const supabase = createAdminClient()

  // Fetch organization subscription data
  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name, subscription_plan, subscription_status')
    .eq('id', auth.organizationId)
    .single()

  if (!organization) {
    return (
      <AuthLayout>
        <PremiumPageShell maxWidth="max-w-4xl">
          <div className="text-center py-12">
            <p className="text-brand-text-medium">Organização não encontrada</p>
          </div>
        </PremiumPageShell>
      </AuthLayout>
    )
  }

  // Normalize plan to handle legacy values
  const currentPlan = (organization.subscription_plan || 'essencial') as Plan
  const subscriptionStatus = organization.subscription_status || 'active'

  return (
    <AuthLayout>
      <PremiumPageShell maxWidth="max-w-4xl">
        <PremiumPageHeader
          title="Planos & Faturamento"
          description="Gerencie sua subscrição e escolha o plano ideal para o seu negócio"
          icon={CreditCard}
          badge={subscriptionStatus === 'active' ? 'Ativo' : subscriptionStatus}
        />

        <PremiumCard>
          <PlanManagement
            currentPlan={currentPlan}
            subscriptionStatus={subscriptionStatus}
          />
        </PremiumCard>
      </PremiumPageShell>
    </AuthLayout>
  )
}
