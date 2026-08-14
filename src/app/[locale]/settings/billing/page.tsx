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

  // Fetch user's organization from user_profiles (guaranteed non-null)
  let userOrgId = auth.organizationId

  if (!userOrgId) {
    // Fallback: query user_profiles directly to get organization_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', auth.userId)
      .single()
    userOrgId = profile?.organization_id
  }

  // Fetch organization subscription data
  let organization

  if (userOrgId) {
    const { data } = await supabase
      .from('organizations')
      .select('id, name, subscription_plan, subscription_status')
      .eq('id', userOrgId)
      .single()
    organization = data
  } else {
    // Last resort: fetch first organization
    const { data } = await supabase
      .from('organizations')
      .select('id, name, subscription_plan, subscription_status')
      .limit(1)
      .maybeSingle()
    organization = data
  }

  if (!organization) {
    return (
      <AuthLayout>
        <PremiumPageShell maxWidth="max-w-4xl">
          <div className="text-center py-12">
            <p className="text-brand-text-medium">Nenhuma organização configurada</p>
            <p className="text-sm text-gray-500 mt-2">Entre em contacto com o suporte para configurar sua organização</p>
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
