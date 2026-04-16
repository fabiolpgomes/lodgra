'use client'

import Link from 'next/link'
import { Globe, ArrowRight, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PublicPagesUsageBarProps {
  used: number
  limit: number | null // null = unlimited
  plan: string
}

export function PublicPagesUsageBar({ used, limit, plan }: PublicPagesUsageBarProps) {
  const isUnlimited = limit === null
  const atLimit = !isUnlimited && used >= limit
  const percentage = isUnlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0

  return (
    <div className={`rounded-xl border-2 p-4 mb-6 transition-all ${
      atLimit 
        ? 'bg-gradient-to-r from-hs-accent-50 to-hs-accent-25 border-hs-accent-300 shadow-sm shadow-hs-accent-200/50' 
        : 'bg-gradient-to-r from-hs-brand-50 to-white border-hs-brand-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <div className={`p-2 rounded-lg ${atLimit ? 'bg-hs-accent-100' : 'bg-hs-brand-100'}`}>
            <Globe className={`h-4 w-4 ${atLimit ? 'text-hs-accent-600' : 'text-hs-brand-600'}`} />
          </div>
          <span className="text-hs-neutral-900">Páginas Públicas</span>
          {used > 0 && <TrendingUp className="h-4 w-4 text-hs-brand-500 ml-auto" />}
        </div>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
          atLimit
            ? 'bg-hs-accent-200 text-hs-accent-700'
            : 'bg-hs-brand-100 text-hs-brand-700'
        }`}>
          {isUnlimited
            ? `${used} / ∞`
            : `${used} / ${limit}`
          }
        </span>
      </div>

      {!isUnlimited && (
        <div className="w-full h-2.5 bg-hs-neutral-200 rounded-full overflow-hidden shadow-sm">
          <div
            className={`h-full rounded-full transition-all duration-500 ${atLimit ? 'bg-gradient-to-r from-hs-accent-400 to-hs-accent-500' : 'bg-gradient-to-r from-hs-brand-400 to-hs-brand-500'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {atLimit && (
        <div className="mt-4 flex items-center justify-between gap-3 p-3 bg-white/60 rounded-lg border border-hs-accent-200">
          <div className="flex-1">
            <p className="text-sm text-hs-accent-800 font-medium">
              Limite atingido
            </p>
            <p className="text-xs text-hs-accent-600">
              Faça upgrade do plano para adicionar mais páginas públicas.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0 bg-hs-accent-600 hover:bg-hs-accent-700 text-white border-0">
            <Link href="/#pricing" className="gap-1">
              Upgrade <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      )}

      {isUnlimited && (
        <div className="mt-2 text-xs text-hs-brand-600 font-medium flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Páginas públicas ilimitadas com o plano {plan}
        </div>
      )}
    </div>
  )
}
