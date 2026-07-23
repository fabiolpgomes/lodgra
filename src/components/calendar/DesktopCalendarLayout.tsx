'use client'

import { useState } from 'react'
import { DetailedCalendarMobile } from './DetailedCalendarMobile'
import { PropertySidebar } from './PropertySidebar'
import { SettingsSidebar } from './SettingsSidebar'
import { HamburgerMenu } from './HamburgerMenu'

interface CalendarDay {
  date: Date
  price: number
  isWeekend: boolean
  isBooked?: boolean
  guestName?: string
  isToday?: boolean
}

interface Property {
  id: string
  name: string
  type: string
  location: string
  imageUrl?: string
  availabilityDots: boolean[]
  calendarDays: CalendarDay[]
}

interface DesktopCalendarLayoutProps {
  properties: Property[]
  initialPropertyId?: string
}

export function DesktopCalendarLayout({
  properties,
  initialPropertyId,
}: DesktopCalendarLayoutProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    initialPropertyId || properties[0]?.id,
  )
  const [showSettings, setShowSettings] = useState(false)

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)

  return (
    <div className="desktop-calendar-layout">
      {/* Mobile hamburger menu (768px < width < 1024px) */}
      <div className="hamburger-menu-container">
        <HamburgerMenu
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onPropertySelect={setSelectedPropertyId}
        />
      </div>

      {/* Left sidebar: Property list (hidden on tablet, shown on desktop) */}
      <div className="sidebar-left">
        <PropertySidebar
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onPropertySelect={setSelectedPropertyId}
        />
      </div>

      {/* Center: Detailed calendar */}
      <div className="calendar-center">
        {selectedProperty && (
          <DetailedCalendarMobile
            propertyName={selectedProperty.name}
            days={selectedProperty.calendarDays}
            onDayClick={() => {}}
            onSettingsClick={() => setShowSettings(true)}
          />
        )}
      </div>

      {/* Settings Modal Overlay (mobile) */}
      {showSettings && (
        <div className={`settings-modal-overlay ${showSettings ? 'open' : ''}`} onClick={() => setShowSettings(false)}>
          <div className="settings-modal-content" onClick={e => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2>Configurações</h2>
              <button
                className="settings-modal-close"
                onClick={() => setShowSettings(false)}
              >
                ✕
              </button>
            </div>
            <SettingsSidebar />
          </div>
        </div>
      )}

      {/* Right sidebar: Settings (hidden on tablet, shown on desktop) */}
      <div className="sidebar-right">
        <SettingsSidebar />
      </div>
    </div>
  )
}
