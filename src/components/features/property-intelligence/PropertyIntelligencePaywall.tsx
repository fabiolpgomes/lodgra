import Link from 'next/link'
import { ArrowRight, ShieldAlert, Sparkles } from 'lucide-react'

import { PremiumCard } from '@/components/common/layout/PremiumPage'
import { Button } from '@/components/common/ui/button'

type PropertyIntelligencePaywallProps = {
  locale: string
  currentPlan?: string | null
  title?: string
  description?: string
}

function formatPlanLabel(plan?: string | null) {
  const normalized = (plan ?? 'essencial').toLowerCase()

  if (normalized === 'expansao') return 'Expansão'
  if (normalized === 'premium') return 'Premium'
  if (normalized === 'enterprise') return 'Enterprise'
  if (normalized === 'development') return 'Desenvolvimento'
  return 'Essencial'
}

export function PropertyIntelligencePaywall({
  locale,
  currentPlan,
  title = 'IA Native disponível no Premium e no Enterprise',
  description = 'Se o seu plano atual ainda não inclui Property Intelligence, pode desbloquear a capability como add-on recorrente sem trocar o plano principal.',
}: PropertyIntelligencePaywallProps) {
  const planLabel = formatPlanLabel(currentPlan)
  const addonHref = `/${locale}/settings/billing?tab=addons&addon=property_intelligence`

  return (
    <PremiumCard className="overflow-hidden border-brand-blue/10 bg-gradient-to-br from-brand-blue/10 via-white to-brand-gold/10">
      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-border-soft bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">
            <ShieldAlert className="h-3.5 w-3.5 text-brand-blue" />
            Acesso bloqueado
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-brand-text-dark sm:text-4xl">
              {title}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-brand-text-medium">
              {description}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-brand-border-soft bg-white/90 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Incluído em</p>
              <p className="mt-2 text-sm font-semibold text-brand-text-dark">Premium</p>
              <p className="mt-1 text-xs text-brand-text-medium">Acesso nativo à IA Native.</p>
            </div>
            <div className="rounded-2xl border border-brand-border-soft bg-white/90 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Também em</p>
              <p className="mt-2 text-sm font-semibold text-brand-text-dark">Enterprise</p>
              <p className="mt-1 text-xs text-brand-text-medium">Pensado para portfólios maiores.</p>
            </div>
            <div className="rounded-2xl border border-brand-border-soft bg-white/90 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Plano atual</p>
              <p className="mt-2 text-sm font-semibold text-brand-text-dark">{planLabel}</p>
              <p className="mt-1 text-xs text-brand-text-medium">Desbloqueie sem alterar o core.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="action" size="premium-sm">
              <Link href={addonHref} className="flex items-center gap-2">
                Comprar add-on
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="premium-secondary" size="premium-sm">
              <Link href={`/${locale}/dashboard`} className="flex items-center gap-2">
                Voltar ao Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-brand-border-soft bg-brand-surface/70 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-blue" />
              <h3 className="text-sm font-semibold text-brand-text-dark">Como o acesso funciona</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-brand-text-medium">
              <p>1. Planos <span className="font-semibold text-brand-text-dark">Premium</span> e <span className="font-semibold text-brand-text-dark">Enterprise</span> têm acesso incluído.</p>
              <p>2. Os outros planos podem comprar o add-on recorrente de Property Intelligence.</p>
              <p>3. Após a ativação, o módulo abre normalmente no menu e na análise.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-brand-border-soft bg-white/85 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-brand-text-dark">O que vai desbloquear</h3>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-brand-text-medium">
              <li>• Entrada guiada com sugestões prontas.</li>
              <li>• Leitura de viabilidade e cenários comparáveis.</li>
              <li>• Dossiê premium pronto para revisão humana.</li>
            </ul>
          </div>
        </div>
      </div>
    </PremiumCard>
  )
}
