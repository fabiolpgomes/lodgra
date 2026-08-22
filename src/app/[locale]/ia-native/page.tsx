import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle,
  Clock,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PremiumCard, PremiumMetricCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'
import { Button } from '@/components/common/ui/button'
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

  const { hasAccess: hasIaNativeAccess, rollout } = await isFeatureAccessible(
    auth.organizationId,
    'property_intelligence'
  )

  if (!hasIaNativeAccess) {
    redirect(`/${locale}/dashboard`)
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
      .select('currency, timezone')
      .eq('id', auth.organizationId)
      .single(),
  ])

  const organizationCurrency = (organization?.currency || 'EUR').toUpperCase()
  const safeCurrency = (organizationCurrency in CURRENCIES
    ? organizationCurrency
    : 'EUR') as CurrencyCode
  const businessTimeZone = organization?.timezone || 'Europe/Lisbon'

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

  const userProfile: UserProfile = {
    id: profile?.id ?? auth.userId,
    email: profile?.email ?? '',
    full_name: profile?.full_name ?? null,
    role: (profile?.role as UserProfile['role']) ?? fallbackRole,
    avatar_url: profile?.avatar_url ?? null,
    access_all_properties: profile?.access_all_properties ?? auth.accessAllProperties,
    organization_id: profile?.organization_id ?? auth.organizationId,
  }

  return (
    <AuthLayout profile={userProfile}>
      <PremiumPageShell maxWidth="max-w-6xl" className="pb-28">
        <PremiumPageHeader
          title="Property Intelligence"
          description="Capability AI Native integrada ao shell com gate controlado, viabilidade de propriedades, retorno esperado e leitura assistida."
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
                <Link href={`/${locale}/dashboard`} className="flex items-center gap-2">
                  Voltar ao Dashboard
                </Link>
              </Button>
            </>
          )}
        />

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <PremiumCard className="relative overflow-hidden border-brand-blue/10 bg-gradient-to-br from-brand-blue/10 via-brand-white to-brand-gold/10">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(201,162,39,0.18),transparent_68%)]" />
            <div className="relative flex h-full flex-col gap-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-blue/15 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[2px] text-brand-blue">
                <ShieldAlert className="h-3.5 w-3.5" />
                Gate controlado
              </div>

              <div className="max-w-2xl space-y-4">
                <h2 className="text-3xl font-semibold tracking-tight text-brand-text-dark sm:text-4xl">
                  Avalie imóveis com leitura de viabilidade, retorno esperado e cenários assistidos.
                </h2>
                <p className="max-w-xl text-sm leading-6 text-brand-text-medium">
                  O módulo entra no shell como uma capability nativa, mantém revisão humana antes de publicação e preserva a fronteira entre suporte à decisão e operação diária.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-brand-border-soft bg-white/85 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Entrada</p>
                  <p className="mt-2 text-sm font-semibold text-brand-text-dark">Localização, tipologia, custos e sazonalidade</p>
                </div>
                <div className="rounded-2xl border border-brand-border-soft bg-white/85 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Saída</p>
                  <p className="mt-2 text-sm font-semibold text-brand-text-dark">Viabilidade, retorno e cenários comparáveis</p>
                </div>
                <div className="rounded-2xl border border-brand-border-soft bg-white/85 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Governança</p>
                  <p className="mt-2 text-sm font-semibold text-brand-text-dark">Ativação controlada, revisão humana e rollback seguro</p>
                </div>
              </div>
            </div>
          </PremiumCard>

          <div className="grid gap-4">
            <PremiumCard className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-brand-blue" />
                <h3 className="text-sm font-semibold text-brand-text-dark">Estado vazio da capability</h3>
              </div>
              <div className="rounded-2xl border border-dashed border-brand-border-soft bg-brand-surface/50 p-4">
                <p className="text-sm font-semibold text-brand-text-dark">Nenhuma análise está em execução neste momento.</p>
                <p className="mt-2 text-sm leading-6 text-brand-text-medium">
                  Abra uma propriedade, recolha os dados mínimos e inicie a análise para ver os cenários e a viabilidade.
                </p>
              </div>
            </PremiumCard>

            <PremiumCard className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-blue" />
                <h3 className="text-sm font-semibold text-brand-text-dark">Contexto da organização</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-brand-border-soft bg-brand-surface/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Moeda base</p>
                  <p className="mt-2 text-sm font-semibold text-brand-text-dark">{organizationCurrency}</p>
                  <p className="mt-1 text-xs text-brand-text-medium">{formatCurrency(1250, safeCurrency)}</p>
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

            <PremiumCard className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-brand-text-dark">Estado atual do módulo</h3>
              </div>
              <div className="space-y-3 text-sm text-brand-text-medium">
                <p>A capability já entra no shell modular apenas para organizações com acesso, preservando a separação entre a leitura estratégica e o core operacional.</p>
                <p>A rota continua controlada e reversível, com contexto da organização, moeda e timezone herdados do core.</p>
                <p>O próximo passo de produto é manter a expansão sob a política definida em PM-3 e validada em QA-3.</p>
              </div>
            </PremiumCard>

            <PremiumCard className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-blue" />
                <h3 className="text-sm font-semibold text-brand-text-dark">Fluxo de uso</h3>
              </div>
              <ol className="space-y-3 text-sm text-brand-text-medium">
                <li className="flex gap-3">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-[11px] font-bold text-brand-blue">1</span>
                  <span>Selecionar um imóvel e reunir os dados mínimos necessários.</span>
                </li>
                <li className="flex gap-3">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-[11px] font-bold text-brand-blue">2</span>
                  <span>Executar a análise determinística e comparar cenários.</span>
                </li>
                <li className="flex gap-3">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-[11px] font-bold text-brand-blue">3</span>
                  <span>Revisar o resultado com evidência antes de qualquer publicação externa.</span>
                </li>
              </ol>
            </PremiumCard>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PremiumMetricCard
            label="Capability nativa"
            value="Property Intelligence"
            description="Entrada clara no shell para viabilidade e retorno esperado."
            icon={Sparkles}
            tone="gold"
          />
          <PremiumMetricCard
            label="Integração"
            value="Gate fechado"
            description="A navegação da capability fica oculta no shell publicado até a ativação controlada."
            icon={Building2}
            tone="blue"
          />
          <PremiumMetricCard
            label="Mecanismo"
            value="Determinístico"
            description="A leitura financeira permanece previsível e auditável."
            icon={BarChart3}
            tone="success"
          />
          <PremiumMetricCard
            label="Controle"
            value="Feature gate"
            description="Ativação por organização, segmento ou rollout gradual."
            icon={TrendingUp}
            tone="blue"
          />
        </div>
      </PremiumPageShell>
    </AuthLayout>
  )
}
