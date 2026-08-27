import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PremiumCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'
import { Button } from '@/components/common/ui/button'
import { PropertyIntelligencePaywall } from '@/components/features/property-intelligence/PropertyIntelligencePaywall'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'
import type { UserProfile } from '@/lib/auth/getUserAccess'
import { writeAuditLog } from '@/lib/audit'
import { CURRENCIES, formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { isFeatureAccessible } from '@/lib/features/featureAccess'

export const dynamic = 'force-dynamic'

export default async function IaNativePage({
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
  const organizationCurrency = organization?.currency?.toUpperCase() ?? null
  const safeCurrency = (organizationCurrency && organizationCurrency in CURRENCIES
    ? organizationCurrency
    : null) as CurrencyCode | null
  const businessTimeZone = organization?.timezone || 'Europe/Lisbon'
  const { hasAccess: hasIaNativeAccess, rollout } = await isFeatureAccessible(
    auth.organizationId,
    'property_intelligence'
  )

  const userProfile: UserProfile = {
    id: profile?.id ?? auth.userId,
    email: profile?.email ?? '',
    full_name: profile?.full_name ?? null,
    role: (profile?.role as UserProfile['role']) ?? fallbackRole,
    avatar_url: profile?.avatar_url ?? null,
    access_all_properties: profile?.access_all_properties ?? auth.accessAllProperties,
    organization_id: profile?.organization_id ?? auth.organizationId,
  }

  if (!hasIaNativeAccess) {
    return (
      <AuthLayout profile={userProfile}>
        <PremiumPageShell maxWidth="max-w-6xl" className="pb-28">
          <PremiumPageHeader
            title="Property Intelligence"
            description="Premium e Enterprise incluem acesso à IA Native. Os restantes planos podem desbloquear a capability como add-on recorrente."
            badge="IA Native"
          />

          <PropertyIntelligencePaywall
            locale={locale}
            currentPlan={currentPlan}
            title="Desbloqueie a IA Native sem trocar de plano"
            description="A IA Native já está incluída nos planos Premium e Enterprise. Se ainda não tem acesso, pode comprar o add-on recorrente e abrir a experiência premium imediatamente."
          />
        </PremiumPageShell>
      </AuthLayout>
    )
  }

  await writeAuditLog({
    userId: auth.userId,
    action: 'access',
    resourceType: 'module',
    resourceId: 'ia-native',
    details: {
      module: 'ia-native',
      locale,
      organization_id: auth.organizationId,
      currency: organizationCurrency,
      timezone: businessTimeZone,
      rollout_mode: rollout.mode,
      rollout_bucket: rollout.cohortBucket,
      rollout_percent: rollout.cohortPercent,
      rollout_reason: rollout.reason,
    },
  })

  return (
    <AuthLayout profile={userProfile}>
      <PremiumPageShell maxWidth="max-w-6xl" className="pb-28">
        <PremiumPageHeader
          title="Property Intelligence"
          description="Avalie a viabilidade de um imóvel e siga um fluxo guiado, curto e premium."
          badge="IA Native"
          icon={Sparkles}
          actions={(
            <>
              <Button asChild variant="action" size="premium-sm">
                <Link href={`/${locale}/properties`} className="flex items-center gap-2">
                  Abrir Propriedades
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="premium-secondary" size="premium-sm">
                <Link href={`/${locale}/ia-native/analyze`} className="flex items-center gap-2">
                  Abrir análise
                </Link>
              </Button>
              <Button asChild variant="premium-secondary" size="premium-sm">
                <Link href={`/${locale}/dashboard`} className="flex items-center gap-2">
                  Voltar ao Dashboard
                </Link>
              </Button>
            </>
          )}
        />

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <PremiumCard className="relative overflow-hidden border-brand-blue/10 bg-gradient-to-br from-brand-blue/10 via-brand-white to-brand-gold/10">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(201,162,39,0.16),transparent_68%)]" />
            <div className="relative space-y-8">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[2px] text-brand-text-medium">
                <span className="rounded-full border border-brand-border-soft bg-white/85 px-3 py-1">Entrada guiada</span>
                <span className="rounded-full border border-brand-border-soft bg-white/85 px-3 py-1">JSON do imóvel</span>
                <span className="rounded-full border border-brand-border-soft bg-white/85 px-3 py-1">Saída premium</span>
              </div>

              <div className="max-w-2xl space-y-4">
                <h2 className="text-3xl font-semibold tracking-tight text-brand-text-dark sm:text-4xl">
                  Comece pela análise e veja, de forma simples, o que precisa inserir.
                </h2>
                <p className="max-w-xl text-sm leading-6 text-brand-text-medium">
                  Esta página foi enxugada para orientar o próximo passo. Na tela de análise, você cola o JSON do imóvel, executa o cálculo e copia o dossiê.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-brand-border-soft bg-white/90 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">1. Abrir</p>
                  <p className="mt-2 text-sm font-semibold text-brand-text-dark">Clique em <span className="whitespace-nowrap">Abrir análise</span>.</p>
                </div>
                <div className="rounded-2xl border border-brand-border-soft bg-white/90 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">2. Inserir</p>
                  <p className="mt-2 text-sm font-semibold text-brand-text-dark">Cole o JSON do imóvel ou carregue o exemplo.</p>
                </div>
                <div className="rounded-2xl border border-brand-border-soft bg-white/90 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">3. Rever</p>
                  <p className="mt-2 text-sm font-semibold text-brand-text-dark">Leia o resultado e copie o dossiê final.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild variant="action" size="premium-sm">
                  <Link href={`/${locale}/ia-native/analyze`} className="flex items-center gap-2">
                    Abrir análise
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="premium-secondary" size="premium-sm">
                  <Link href={`/${locale}/properties`} className="flex items-center gap-2">
                    Ver propriedades
                  </Link>
                </Button>
              </div>
            </div>
          </PremiumCard>

          <div className="grid gap-4">
            <PremiumCard className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-blue" />
                <h3 className="text-sm font-semibold text-brand-text-dark">O que preparar</h3>
              </div>
              <ul className="space-y-2 text-sm leading-6 text-brand-text-medium">
                <li>Localização, tipologia e área do imóvel.</li>
                <li>Custos, ocupação esperada e moeda.</li>
                <li>Se quiser, comece pelo exemplo já carregado na análise.</li>
              </ul>
            </PremiumCard>

            <PremiumCard className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-brand-text-dark">O que vai receber</h3>
              </div>
              <ul className="space-y-2 text-sm leading-6 text-brand-text-medium">
                <li>Leitura de viabilidade do imóvel.</li>
                <li>Cenários comparáveis com retorno esperado.</li>
                <li>Resultado pronto para revisão humana.</li>
              </ul>
            </PremiumCard>

            <PremiumCard className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-blue" />
                <h3 className="text-sm font-semibold text-brand-text-dark">Contexto atual</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-brand-border-soft bg-brand-surface/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Moeda</p>
                  <p className="mt-2 text-sm font-semibold text-brand-text-dark">{organizationCurrency || '-'}</p>
                  <p className="mt-1 text-xs text-brand-text-medium">
                    {safeCurrency ? formatCurrency(1250, safeCurrency) : '1250.00'}
                  </p>
                </div>
                <div className="rounded-2xl border border-brand-border-soft bg-brand-surface/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Timezone</p>
                  <p className="mt-2 text-sm font-semibold text-brand-text-dark">{businessTimeZone}</p>
                  <p className="mt-1 text-xs text-brand-text-medium">
                    {new Intl.DateTimeFormat(locale, {
                      timeZone: businessTimeZone,
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date())}
                  </p>
                </div>
              </div>
            </PremiumCard>
          </div>
        </div>
      </PremiumPageShell>
    </AuthLayout>
  )
}
