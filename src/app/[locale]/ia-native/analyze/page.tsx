import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, PlayCircle } from 'lucide-react'

import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PremiumCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'
import { Button } from '@/components/common/ui/button'
import { PropertyIntelligencePaywall } from '@/components/features/property-intelligence/PropertyIntelligencePaywall'
import { PropertyIntelligenceWorkbench } from '@/components/features/property-intelligence/PropertyIntelligenceWorkbench'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserProfile } from '@/lib/auth/getUserAccess'
import { isFeatureAccessible } from '@/lib/features/featureAccess'
import { isPropertyIntelligenceAnalysisEnabled } from '@/lib/property-intelligence/gate'

export const dynamic = 'force-dynamic'

export default async function PropertyIntelligenceAnalyzePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const auth = await requireRole(['admin', 'gestor'])

  if (!auth.authorized) {
    redirect(`/${locale}/login`)
  }

  if (!auth.organizationId) {
    redirect(`/${locale}/onboarding`)
  }

  const adminClient = createAdminClient()
  const fallbackRole: UserProfile['role'] =
    auth.role === 'admin' || auth.role === 'gestor' ? auth.role : 'viewer'

  const [{ data: profile }, { data: organization }] = await Promise.all([
    adminClient
      .from('user_profiles')
      .select('id, email, full_name, role, avatar_url, access_all_properties, organization_id')
      .eq('id', auth.userId)
      .single(),
    adminClient
      .from('organizations')
      .select('currency, timezone, subscription_plan, plan')
      .eq('id', auth.organizationId)
      .single(),
  ])

  const currentPlan = organization?.subscription_plan || organization?.plan || 'essencial'
  const userProfile: UserProfile = {
    id: profile?.id ?? auth.userId,
    email: profile?.email ?? '',
    full_name: profile?.full_name ?? null,
    role: (profile?.role as UserProfile['role']) ?? fallbackRole,
    avatar_url: profile?.avatar_url ?? null,
    access_all_properties: profile?.access_all_properties ?? auth.accessAllProperties,
    organization_id: profile?.organization_id ?? auth.organizationId,
  }

  const organizationCurrency = organization?.currency?.toUpperCase() ?? null
  const businessTimeZone = organization?.timezone || 'Europe/Lisbon'
  const gateEnabled = isPropertyIntelligenceAnalysisEnabled()
  const { hasAccess } = await isFeatureAccessible(auth.organizationId, 'property_intelligence')

  if (!hasAccess) {
    return (
      <AuthLayout profile={userProfile}>
        <PremiumPageShell maxWidth="max-w-7xl" className="pb-28">
          <PremiumPageHeader
            title="Gerar relatório"
            description="Premium e Enterprise incluem acesso à IA Native. Se o seu plano ainda não inclui a capability, pode desbloqueá-la como add-on recorrente."
            badge="DEV-3"
            actions={(
              <Button asChild variant="premium-secondary" size="premium-sm">
                <Link href={`/${locale}/ia-native`} className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Link>
              </Button>
            )}
          />

          <PropertyIntelligencePaywall
            locale={locale}
            currentPlan={currentPlan}
            title="Desbloqueie o relatório guiado da IA Native"
            description="Os planos Premium e Enterprise já incluem acesso. Nos restantes planos, compre o add-on recorrente e volte a este fluxo sem perder contexto."
          />
        </PremiumPageShell>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout profile={userProfile}>
      <PremiumPageShell maxWidth="max-w-7xl" className="pb-28">
        <PremiumPageHeader
          title="Gerar relatório"
          description="Responda às perguntas guiadas, escolha as sugestões e deixe o sistema montar a entrada automaticamente."
          badge="DEV-3"
          actions={(
            <>
              <Button asChild variant="premium-secondary" size="premium-sm">
                <Link href={`/${locale}/ia-native`} className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Link>
              </Button>
              <Button asChild variant="action" size="premium-sm">
                <Link href={`/${locale}/ia-native`} className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Visão geral
                </Link>
              </Button>
              <Button asChild variant="premium-secondary" size="premium-sm">
                <Link href="#executar-analise" className="flex items-center gap-2">
                  Executar análise
                </Link>
              </Button>
            </>
          )}
        />

        <PremiumCard className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-brand-border-soft bg-brand-surface/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Modo</p>
              <p className="mt-2 text-sm font-semibold text-brand-text-dark">CLI-first, stateless</p>
            </div>
            <div className="rounded-2xl border border-brand-border-soft bg-brand-surface/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Moeda</p>
              <p className="mt-2 text-sm font-semibold text-brand-text-dark">{organizationCurrency || '-'}</p>
            </div>
            <div className="rounded-2xl border border-brand-border-soft bg-brand-surface/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Timezone</p>
              <p className="mt-2 text-sm font-semibold text-brand-text-dark">{businessTimeZone}</p>
            </div>
            <div className="rounded-2xl border border-brand-border-soft bg-brand-surface/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Gate</p>
              <p className="mt-2 text-sm font-semibold text-brand-text-dark">Feature access controlado</p>
            </div>
          </div>
        </PremiumCard>

        <PropertyIntelligenceWorkbench gateEnabled={gateEnabled} />
      </PremiumPageShell>
    </AuthLayout>
  )
}
