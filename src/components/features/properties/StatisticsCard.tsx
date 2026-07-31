'use client'

import { ReactNode } from 'react'

export interface StatisticItem {
  label: string
  value: string | number
  icon?: ReactNode
  variant?: 'default' | 'highlight'
}

export function StatisticsCard({ items, title }: { items: StatisticItem[]; title: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-brand-text-dark mb-4">
        {title}
      </h3>
      <div className="space-y-4">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
              item.variant === 'highlight'
                ? 'bg-brand-blue/5 border border-brand-blue/10'
                : 'bg-brand-surface-soft border border-brand-border-soft'
            }`}
          >
            <div className="flex items-center gap-2">
              {item.icon && (
                <span className="text-brand-blue shrink-0">
                  {item.icon}
                </span>
              )}
              <span className="text-sm text-brand-text-medium">
                {item.label}
              </span>
            </div>
            <span
              className={`text-xl font-bold ${
                item.variant === 'highlight'
                  ? 'text-brand-blue'
                  : 'text-brand-text-dark'
              }`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
