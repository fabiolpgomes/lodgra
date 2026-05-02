'use client'

import { useState } from 'react'
import { LazyRevenueChart as RevenueChart } from '@/components/common/lazy/LazyCharts'

const ACTIVE_COLORS: Record<string, string> = {
  EUR: 'bg-blue-600',
  BRL: 'bg-green-600',
  USD: 'bg-yellow-600',
  GBP: 'bg-purple-600',
}

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
        <div className="flex gap-1 mb-2 ml-7">
          {currencies.map(cur => (
            <button
              key={cur}
              onClick={() => setSelected(cur)}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                selected === cur
                  ? `${ACTIVE_COLORS[cur] || 'bg-blue-600'} text-white`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {cur}
            </button>
          ))}
        </div>
      )}
      <RevenueChart data={data} currency={selected} />
    </>
  )
}
