import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

const BADGE_COLORS: Record<string, string> = {
  EUR: 'bg-blue-50 text-blue-700 ring-blue-200',
  BRL: 'bg-green-50 text-green-700 ring-green-200',
  USD: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  GBP: 'bg-purple-50 text-purple-700 ring-purple-200',
}
const DEFAULT_BADGE = 'bg-gray-100 text-gray-700 ring-gray-200'

const SIZE_CLASSES = {
  sm: 'text-base font-semibold',
  md: 'text-2xl font-bold',
  lg: 'text-3xl font-bold',
  xl: 'text-4xl font-bold',
}

interface CurrencyStackProps {
  totals: Record<string, number>
  size?: 'sm' | 'md' | 'lg' | 'xl'
  colorize?: boolean
  showEmpty?: boolean
  hideSingleBadge?: boolean
}

export function CurrencyStack({
  totals,
  size = 'md',
  colorize = false,
  showEmpty = true,
  hideSingleBadge = false,
}: CurrencyStackProps) {
  const entries = Object.entries(totals).filter(([, v]) => v !== 0)

  if (entries.length === 0) {
    return showEmpty ? (
      <span className={`${SIZE_CLASSES[size]} text-gray-300`}>—</span>
    ) : null
  }

  const isSingle = entries.length === 1

  return (
    <div className="space-y-1.5">
      {entries.map(([currency, amount]) => {
        const badgeColor = BADGE_COLORS[currency] ?? DEFAULT_BADGE
        const amountColor = colorize
          ? amount >= 0 ? 'text-gray-900' : 'text-red-600'
          : 'text-gray-900'

        return (
          <div key={currency} className="flex items-center gap-2">
            {!(hideSingleBadge && isSingle) && (
              <span
                className={`inline-flex items-center justify-center min-w-[2.5rem] h-5 px-1.5 text-[10px] font-bold uppercase tracking-widest rounded ring-1 shrink-0 ${badgeColor}`}
              >
                {currency}
              </span>
            )}
            <span className={`${SIZE_CLASSES[size]} ${amountColor} tabular-nums`}>
              {formatCurrency(amount, currency as CurrencyCode)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
