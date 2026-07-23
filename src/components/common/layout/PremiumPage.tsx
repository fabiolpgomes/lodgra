import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'

type IconComponent = ComponentType<LucideProps>

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function PremiumPageShell({
  children,
  maxWidth = 'max-w-7xl',
  className,
}: {
  children: ReactNode
  maxWidth?: string
  className?: string
}) {
  return (
    <main className={joinClasses('mx-auto w-full space-y-7 px-4 py-8 sm:px-6 lg:px-8', maxWidth, className)}>
      {children}
    </main>
  )
}

export function PremiumPageHeader({
  title,
  description,
  badge,
  icon: Icon,
  actions,
}: {
  title: string
  description?: string
  badge?: string
  icon?: IconComponent
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        {Icon && (
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-blue/10 bg-brand-blue/5 text-brand-blue">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold uppercase tracking-tight text-brand-text-dark">
              {title}
            </h1>
            {badge && (
              <span className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-blue">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs font-semibold text-brand-text-medium">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function PremiumCard({
  children,
  className,
  as: Component = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section'
}) {
  return (
    <Component
      className={joinClasses(
        'group rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]',
        className
      )}
    >
      {children}
    </Component>
  )
}

export function PremiumMetricCard({
  label,
  value,
  type,
  description,
  icon: Icon,
  tone = 'blue',
  compact = false,
}: {
  label: string
  value: ReactNode
  type?: string
  description?: string
  icon: IconComponent
  tone?: 'blue' | 'gold' | 'success' | 'danger'
  /** Versão mais enxuta (ícone/valor menores, menos respiro, sem descrição) — para telas com muitos cards lado a lado. */
  compact?: boolean
}) {
  const toneClasses = {
    blue: 'border-brand-blue/10 bg-brand-bg text-brand-blue',
    gold: 'border-brand-gold/20 bg-brand-gold/10 text-brand-gold',
    success: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-600',
    danger: 'border-red-500/15 bg-red-500/10 text-red-600',
  }

  return (
    <PremiumCard className={joinClasses('relative flex flex-col', compact && 'p-4')}>
      <div className={joinClasses('flex w-full items-center justify-between', compact ? 'mb-2' : 'mb-4')}>
        <div className={joinClasses(
          'flex items-center justify-center rounded-xl border transition-all group-hover:scale-105 group-hover:border-brand-gold/40 group-hover:bg-brand-gold/10 group-hover:text-brand-gold',
          compact ? 'h-8 w-8' : 'h-10 w-10',
          toneClasses[tone]
        )}>
          <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </div>
        {type && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium transition-colors group-hover:text-brand-gold">
            {type}
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className={joinClasses(
          'font-bold leading-none tracking-tight text-brand-text-dark transition-colors group-hover:text-brand-gold',
          compact ? 'text-xl' : 'text-3xl'
        )}>
          {value}
        </div>
        <p className={joinClasses('font-semibold text-brand-text-medium', compact ? 'mt-1 text-[11px]' : 'mt-2 text-xs')}>{label}</p>
      </div>
      {description && !compact && (
        <div className="mt-4 w-full border-t border-brand-bg pt-3">
          <p className="text-[10px] font-medium text-brand-text-medium">{description}</p>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-2xl bg-gradient-to-r from-transparent via-brand-gold/0 to-transparent transition-all duration-500 group-hover:via-brand-gold" />
    </PremiumCard>
  )
}
