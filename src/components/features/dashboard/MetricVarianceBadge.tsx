/**
 * Story 39.2: badge de variação MoM/YoY reutilizável.
 *
 * Reaproveita o padrão visual de badge já existente no dashboard
 * (`src/app/[locale]/dashboard/page.tsx`, badge de margem do card "Lucro Real":
 * `rounded px-1.5 py-0.5 text-[9px] font-bold`, cores por faixa) em vez de um
 * componente novo do zero.
 *
 * `value === null` significa "sem período de comparação" (ex.: propriedade nova,
 * mês sem nenhuma reserva na materialized view) — nunca deve ser confundido com
 * variação 0%. Exibe "—" nesse caso, conforme critério de aceite da Story 39.2.
 */

type MetricVarianceBadgeProps = {
  /** Variação percentual (ex.: 12 para +12%, -8 para -8%). `null` = sem dado de comparação. */
  value: number | null
  /** Rótulo curto do período comparado (ex.: "MoM", "YoY"). */
  label: string
}

export function MetricVarianceBadge({ value, label }: MetricVarianceBadgeProps) {
  if (value === null) {
    return (
      <span
        className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-neutral-200/50 text-brand-text-medium"
        title={`${label}: sem período de comparação`}
      >
        {label} —
      </span>
    )
  }

  const isPositive = value > 0
  const isNeutral = value === 0
  const colorClass = isNeutral
    ? 'bg-neutral-200/50 text-brand-text-medium'
    : isPositive
      ? 'bg-emerald-500/10 text-emerald-600'
      : 'bg-red-500/10 text-red-600'
  const sign = isPositive ? '+' : ''

  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${colorClass}`}>
      {label} {sign}{value}%
    </span>
  )
}
