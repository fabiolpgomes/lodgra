'use client'

import { useState } from 'react'
import { LazyRevenueChart as RevenueChart } from '@/components/common/lazy/LazyCharts'

interface RevenueChartWrapperProps {
  revenueDataByCurrency: Record<string, { month: string; revenue: number }[]>
}

export function RevenueChartWrapper({ revenueDataByCurrency }: RevenueChartWrapperProps) {
  const currencies = Object.keys(revenueDataByCurrency)
  const [selected, setSelected] = useState(currencies[0] || 'EUR')
  const data = revenueDataByCurrency[selected] || []

  return (
    <>
      {currencies.length > 1 && (
        <div className="mb-4 flex justify-end">
          <div className="flex rounded-xl border border-neutral-200/70 bg-brand-bg p-1 shadow-2xs">
          {currencies.map(cur => (
            <button
              key={cur}
              onClick={() => setSelected(cur)}
              className={`min-w-14 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                selected === cur
                  ? 'bg-brand-white text-brand-gold shadow-2xs'
                  : 'text-brand-blue hover:bg-brand-white/70'
              }`}
            >
              {cur}
            </button>
          ))}
          </div>
        </div>
      )}
      <RevenueChart data={data} currency={selected} />
    </>
  )
}
