'use client'

import { useState } from 'react'

type TabName = 'prices' | 'discounts' | 'availability'

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
  ]

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab)
    onTabChange(tab)
  }

  return (
    <div className="settings-tabs-container">
      {/* Tab Navigation */}
      <div className="tabs-nav" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.name}
            role="tab"
            aria-selected={activeTab === tab.name}
            aria-controls={`${tab.name}-panel`}
            onClick={() => handleTabChange(tab.name)}
            className={`tab-button ${activeTab === tab.name ? 'active' : 'inactive'}`}
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
        className="tab-content"
      >
        {children}
      </div>
    </div>
  )
}
