'use client'

import { useState } from 'react'

type TabName = 'prices' | 'discounts' | 'availability' | 'cancellations' | 'taxes'

interface SettingsTabsProps {
  onTabChange: (tab: TabName) => void
  children: React.ReactNode
}

export function SettingsTabs({ onTabChange, children }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabName>('prices')

  const tabs = [
    { name: 'prices' as TabName, label: 'Preços' },
    { name: 'discounts' as TabName, label: 'Descontos' },
    { name: 'availability' as TabName, label: 'Disponibilidade' },
    { name: 'cancellations' as TabName, label: 'Cancelamentos' },
    { name: 'taxes' as TabName, label: 'Taxas' },
  ]

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab)
    onTabChange(tab)
  }

  return (
    <div className="w-full flex flex-col bg-white">
      {/* Tab Navigation - Design.md product-tab style */}
      <div
        className="flex gap-0 border-b border-[#E5DFD2]"
        role="tablist"
      >
        {tabs.map(tab => (
          <button
            key={tab.name}
            role="tab"
            aria-selected={activeTab === tab.name}
            aria-controls={`${tab.name}-panel`}
            onClick={() => handleTabChange(tab.name)}
            className={`px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.name
                ? 'text-[#1B2430] border-b-2 border-[#1B2430]' // ink + underline
                : 'text-[#4D5566]' // body/muted
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        id={`${activeTab}-panel`}
        role="tabpanel"
        aria-labelledby={activeTab}
        className="flex-1"
      >
        {children}
      </div>
    </div>
  )
}
