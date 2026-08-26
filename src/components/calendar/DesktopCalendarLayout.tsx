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
  const [showPriceEditor, setShowPriceEditor] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [editingPrice, setEditingPrice] = useState<number | ''> ('')

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)

  const handleDayClick = (date: Date) => {
    // Toggle date selection for period
    const dateTime = date.getTime()
    const isSelected = selectedDates.some(d => d.getTime() === dateTime)

    console.log(`Day clicked: ${date.toDateString()}, Selected: ${isSelected}, Total: ${selectedDates.length}`)

    if (isSelected) {
      setSelectedDates(selectedDates.filter(d => d.getTime() !== dateTime))
    } else {
      setSelectedDates([...selectedDates, new Date(date)])
    }
  }

  const openPriceEditor = () => {
    if (selectedDates.length > 0) {
      setShowPriceEditor(true)
      setEditingPrice('')
    }
  }

  const handleSavePrice = async () => {
    if (!selectedProperty || selectedDates.length === 0 || editingPrice === '') return

    const price = parseFloat(String(editingPrice))
    if (isNaN(price) || price < 1) {
      alert('Preço deve ser >= 1')
      return
    }

    try {
      // Update pricing for all selected dates
      const response = await fetch(`/api/properties/${selectedProperty.id}/pricing/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dates: selectedDates.map(d => d.toISOString().split('T')[0]),
          base_price: price,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update prices')
      }

      // Reset
      setSelectedDates([])
      setEditingPrice('')
      setShowPriceEditor(false)
      alert(`✅ ${result.data.updated_dates} dia(s) atualizado(s) com sucesso!`)
    } catch (error) {
      console.error('Error saving prices:', error)
      alert('Erro ao guardar preço')
    }
  }

  return (
    <div className="desktop-calendar-layout grid min-h-screen grid-cols-1 bg-[#FBFAF6] lg:grid-cols-[280px_minmax(0,1fr)_320px]">
      {/* Mobile hamburger menu (768px < width < 1024px) */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E5DFD2] bg-white px-4 py-3 lg:hidden">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#717171]">Propriedades</p>
          <p className="text-sm font-semibold text-[#1B2430]">Calendários</p>
        </div>
        <HamburgerMenu
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onPropertySelect={setSelectedPropertyId}
        />
      </div>

      {/* Left sidebar: Property list (hidden on tablet, shown on desktop) */}
      <div className="sidebar-left hidden border-r border-[#E5DFD2] bg-white lg:block">
        <PropertySidebar
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onPropertySelect={setSelectedPropertyId}
        />
      </div>

      {/* Center: Detailed calendar */}
      <div className="calendar-center min-w-0 lg:border-r lg:border-[#E5DFD2]">
        {selectedProperty && (
          <>
            <DetailedCalendarMobile
              propertyName={selectedProperty.name}
              days={selectedProperty.calendarDays}
              selectedDates={selectedDates}
              onDayClick={handleDayClick}
              onSettingsClick={() => setShowSettings(true)}
            />

            {/* Price Editor for Selected Dates */}
            {selectedDates.length > 0 && (
              <div className="date-selection-footer fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-1rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-[#E5DFD2] bg-white px-4 py-3 shadow-lg">
                <span>{selectedDates.length} dia(s) selecionado(s)</span>
                <button onClick={openPriceEditor} className="btn-edit-price h-11 rounded-xl bg-[#10203E] px-4 font-medium text-white">
                  Editar Preço
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Settings Modal Overlay (mobile) */}
      {showSettings && (
        <div className={`settings-modal-overlay ${showSettings ? 'open' : ''} fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 lg:hidden`} onClick={() => setShowSettings(false)}>
          <div className="settings-modal-content w-full max-w-md rounded-t-2xl bg-white" onClick={e => e.stopPropagation()}>
            <div className="settings-modal-header flex items-center justify-between border-b border-[#E5DFD2] px-4 py-4">
              <h2 className="text-base font-semibold text-[#1B2430]">Configurações</h2>
              <button
                className="settings-modal-close flex h-11 w-11 items-center justify-center rounded-full text-[#1B2430] hover:bg-[#F7F5EF]"
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
      <div className="sidebar-right hidden border-l border-[#E5DFD2] bg-white lg:block">
        <SettingsSidebar />
      </div>

      {/* Price Editor Modal */}
      {showPriceEditor && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4" onClick={() => setShowPriceEditor(false)}>
          <div className="modal-box w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <h3>Editar Preço Base</h3>
            <p className="modal-subtitle text-sm text-[#4D5566]">
              {selectedDates.length} dia(s) selecionado(s)
            </p>

            <input
              type="number"
              min="1"
              step="0.01"
              value={editingPrice}
              onChange={e => setEditingPrice(e.target.value ? parseFloat(e.target.value) : '')}
              placeholder="Preço Base"
              className="price-input mt-4 h-12 w-full rounded-xl border border-[#E5DFD2] px-4 text-base"
              autoFocus
            />

            <div className="modal-buttons mt-4 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                onClick={() => setShowPriceEditor(false)}
                className="btn-cancel h-12 flex-1 rounded-xl border border-[#E5DFD2] px-4 text-[#1B2430] hover:bg-[#F7F5EF]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePrice}
                className="btn-save h-12 flex-1 rounded-xl bg-[#10203E] px-4 text-white hover:bg-[#0D1A2E]"
                disabled={editingPrice === ''}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .date-selection-footer {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          gap: 12px;
          align-items: center;
          z-index: 100;
        }

        .btn-edit-price {
          padding: 8px 16px;
          background: #1f2937;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .btn-edit-price:hover {
          background: #111827;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-box {
          background: white;
          padding: 24px;
          border-radius: 8px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .modal-box h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .modal-subtitle {
          margin: 0 0 16px 0;
          font-size: 14px;
          color: #6b7280;
        }

        .price-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 16px;
          margin-bottom: 20px;
          font-family: inherit;
        }

        .price-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .modal-buttons {
          display: flex;
          gap: 12px;
        }

        .btn-cancel,
        .btn-save {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          font-size: 14px;
          font-family: inherit;
        }

        .btn-cancel {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-cancel:hover {
          background: #e5e7eb;
        }

        .btn-save {
          background: #1f2937;
          color: white;
        }

        .btn-save:hover:not(:disabled) {
          background: #111827;
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
