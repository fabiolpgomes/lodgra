'use client'

import { useState, type ReactNode } from 'react'
import { CalendarDays, Settings2, Lock } from 'lucide-react'

type TabKey = 'ical' | 'booking'

interface ChannelsModeTabsProps {
  icalPanel: ReactNode
  bookingPanel: ReactNode
}

export function ChannelsModeTabs({ icalPanel, bookingPanel }: ChannelsModeTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('ical')

  const tabs: Array<{
    key: TabKey
    label: string
    description: string
    icon: ReactNode
    pill: string
  }> = [
    {
      key: 'ical',
      label: 'Sync iCal',
      description: 'Operação normal',
      icon: <CalendarDays className="h-4 w-4" />,
      pill: 'Ativo',
    },
    {
      key: 'booking',
      label: 'Booking API',
      description: 'Sandbox / preparação',
      icon: <Settings2 className="h-4 w-4" />,
      pill: 'Desativado',
    },
  ]

  return (
    <div className="space-y-5">
      <div
        className="grid grid-cols-1 gap-3 rounded-3xl border border-brand-gold/20 bg-white p-2 sm:grid-cols-2"
        role="tablist"
        aria-label="Modos de sincronização"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex items-center justify-between gap-4 rounded-2xl border px-4 py-4 text-left transition-all',
                isActive
                  ? 'border-brand-blue/25 bg-brand-blue/5 shadow-sm'
                  : 'border-transparent bg-transparent hover:border-brand-blue/10 hover:bg-brand-blue/5',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <div
                  className={[
                    'mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl',
                    isActive
                      ? 'bg-brand-blue/10 text-brand-blue'
                      : 'bg-brand-gold/10 text-brand-text-medium',
                  ].join(' ')}
                >
                  {tab.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-text-dark">{tab.label}</p>
                  <p className="text-xs text-brand-text-medium">{tab.description}</p>
                </div>
              </div>

              <span
                className={[
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium',
                  tab.key === 'ical'
                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-800'
                    : 'border border-amber-500/20 bg-amber-500/10 text-amber-900',
                ].join(' ')}
              >
                {tab.key === 'booking' && <Lock className="h-3 w-3" />}
                {tab.pill}
              </span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel">{activeTab === 'ical' ? icalPanel : bookingPanel}</div>
    </div>
  )
}
