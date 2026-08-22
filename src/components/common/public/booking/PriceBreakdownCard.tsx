'use client'

import type { PropertyPriceQuote } from '@/hooks/usePropertyPriceQuote'

interface PriceBreakdownCardProps {
  quote: PropertyPriceQuote | null
  currency: string
  loading?: boolean
  error?: string | null
  compact?: boolean
}

const currencySymbols: Record<string, string> = {
  BRL: 'R$',
  EUR: '€',
  USD: '$',
}

function formatMoney(currency: string, value: number): string {
  const symbol = currencySymbols[currency] || currency
  return `${symbol}${value.toFixed(2)}`
}

function discountLabel(discountType: 'weekly' | 'monthly' | null): string {
  if (discountType === 'weekly') return 'Desconto por semana'
  if (discountType === 'monthly') return 'Desconto por mês'
  return 'Desconto'
}

export function PriceBreakdownCard({
  quote,
  currency,
  loading = false,
  error = null,
  compact = false,
}: PriceBreakdownCardProps) {
  if (!quote && !loading && !error) return null

  return (
    <div className="rounded-xl border border-brand-gold/15 bg-brand-bg p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-brand-text-dark">Resumo do preço</span>
        {loading && (
          <span className="inline-flex items-center gap-2 text-xs text-brand-text-medium">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" />
            A recalcular
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {quote && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-brand-text-medium">
            <span>Preço base</span>
            <span>{formatMoney(currency, quote.baseTotal)}</span>
          </div>

          {quote.discountApplied ? (
            <div className="flex justify-between text-brand-text-medium">
              <span>{discountLabel(quote.discountType)} ({quote.discountPercentage}%)</span>
              <span className="text-emerald-700">-{formatMoney(currency, quote.discountAmount)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-brand-text-medium">
              <span>Desconto</span>
              <span>—</span>
            </div>
          )}

          {!compact && quote.breakdown.length > 0 && (
            <div className="pt-1 space-y-1 text-xs text-brand-text-medium border-t border-brand-gold/10">
              {quote.breakdown.map((item) => (
                <div key={item.date} className="flex justify-between">
                  <span>{item.date}</span>
                  <span>{formatMoney(currency, item.price)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between font-bold text-brand-text-dark pt-1 border-t border-brand-gold/15">
            <span>Total</span>
            <span className="text-brand-blue">{formatMoney(currency, quote.finalTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
