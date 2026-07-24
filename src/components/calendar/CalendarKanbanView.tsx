'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Property {
  id: string
  name: string
  type: string
  location: string
  imageUrl?: string
}

interface Reservation {
  id: string
  propertyId: string
  guestName: string
  guestCount?: number
  startDate: Date
  endDate: Date
  price: number
  status: 'pending' | 'confirmed' | 'hosting' | 'completed'
}

interface CalendarKanbanViewProps {
  properties: Property[]
  reservations: Reservation[]
  selectedPropertyId?: string
  onPropertyClick?: (propertyId: string) => void
}

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

export function CalendarKanbanView({
  properties,
  reservations,
  selectedPropertyId,
  onPropertyClick,
}: CalendarKanbanViewProps) {
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'pt-BR'

  const daysHeaderRef = useRef<HTMLDivElement>(null)
  const cellsGridRef = useRef<HTMLDivElement>(null)
  const propertiesColumnRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [weekIndex, setWeekIndex] = useState(4) // Start at week 4 (late July)
  const [prices, setPrices] = useState<Record<string, number>>({}) // Store custom prices
  const [availability, setAvailability] = useState<Record<string, 'available' | 'blocked'>>({})
  const [minNights, setMinNights] = useState<Record<string, number>>({})
  const [editingCell, setEditingCell] = useState<{ propertyId: string; dayIndex: number } | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editAvailability, setEditAvailability] = useState<'available' | 'blocked'>('available')
  const [editMinNights, setEditMinNights] = useState('')
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set()) // Store selected days
  const [lastSelectedDay, setLastSelectedDay] = useState<string | null>(null) // For shift+click range
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null) // Selected property for config panel
  const [propertyMinNights, setPropertyMinNights] = useState<Record<string, number>>({}) // Min nights per property
  const [configTab, setConfigTab] = useState<'preco' | 'desconto' | 'disponibilidade' | 'cancelamentos'>('preco')

  // Generate 90 days for better UX (3 months for scrolling)
  const baseDate = new Date(2026, 5, 1) // June 1, 2026
  const allDays = Array.from({ length: 90 }, (_, i) => {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + i)
    return date
  })

  // Get reservation for a date and property
  const getReservationForDate = (propertyId: string, date: Date) => {
    return reservations.find(res => {
      if (res.propertyId !== propertyId) return false
      const start = new Date(res.startDate)
      const end = new Date(res.endDate)
      return date >= start && date < end
    })
  }

  // Check if this is the first day of a reservation (for multi-day span styling)
  const isReservationStart = (propertyId: string, date: Date) => {
    const res = getReservationForDate(propertyId, date)
    if (!res) return false
    const start = new Date(res.startDate)
    return date.toDateString() === start.toDateString()
  }

  // Check if this is the last day of a reservation (for multi-day span styling)
  const isReservationEnd = (propertyId: string, date: Date) => {
    const res = getReservationForDate(propertyId, date)
    if (!res) return false
    const end = new Date(res.endDate)
    const prevDay = new Date(end)
    prevDay.setDate(prevDay.getDate() - 1)
    return date.toDateString() === prevDay.toDateString()
  }

  // Check if a date is within a reservation for a property
  const isDateInReservation = (propertyId: string, date: Date): boolean => {
    return !!getReservationForDate(propertyId, date)
  }

  // Current week start
  const currentWeekStart = new Date(baseDate)
  currentWeekStart.setDate(currentWeekStart.getDate() + weekIndex * 7)
  const monthDisplay = MONTHS[currentWeekStart.getMonth()]
  const year = currentWeekStart.getFullYear()

  // Sync scroll position when week index changes
  useEffect(() => {
    if (daysHeaderRef.current && cellsGridRef.current) {
      const scrollPos = weekIndex * (7 * 101) // 101px = 100px cell + 1px gap

      // Use multiple frames to ensure perfect sync
      const syncScroll = () => {
        if (daysHeaderRef.current && cellsGridRef.current) {
          daysHeaderRef.current.scrollLeft = scrollPos
          cellsGridRef.current.scrollLeft = scrollPos
        }
      }

      // Sync immediately
      syncScroll()

      // Sync after animation frame
      const frameId = requestAnimationFrame(syncScroll)

      // Sync again after render
      const timer = setTimeout(syncScroll, 0)

      return () => {
        cancelAnimationFrame(frameId)
        clearTimeout(timer)
      }
    }
  }, [weekIndex])

  // Sync horizontal scroll between headers and cells
  useEffect(() => {
    const headerEl = daysHeaderRef.current
    const cellsEl = cellsGridRef.current

    if (!headerEl || !cellsEl) return

    let syncTimeout: NodeJS.Timeout | null = null

    const handleHeaderScroll = () => {
      if (syncTimeout) clearTimeout(syncTimeout)
      // Sync cells to header immediately
      cellsEl.scrollLeft = headerEl.scrollLeft
      // Ensure sync after scroll ends
      syncTimeout = setTimeout(() => {
        cellsEl.scrollLeft = headerEl.scrollLeft
      }, 50)
    }

    const handleCellsScroll = () => {
      if (syncTimeout) clearTimeout(syncTimeout)
      // Sync header to cells immediately
      headerEl.scrollLeft = cellsEl.scrollLeft
      // Ensure sync after scroll ends
      syncTimeout = setTimeout(() => {
        headerEl.scrollLeft = cellsEl.scrollLeft
      }, 50)
    }

    headerEl.addEventListener('scroll', handleHeaderScroll, { passive: true })
    cellsEl.addEventListener('scroll', handleCellsScroll, { passive: true })

    return () => {
      if (syncTimeout) clearTimeout(syncTimeout)
      headerEl.removeEventListener('scroll', handleHeaderScroll)
      cellsEl.removeEventListener('scroll', handleCellsScroll)
    }
  }, [])

  // Sync vertical scroll between properties column and cells grid
  useEffect(() => {
    const propsEl = propertiesColumnRef.current
    const cellsEl = cellsGridRef.current

    if (!propsEl || !cellsEl) return

    let syncTimeout: NodeJS.Timeout | null = null

    const handlePropsScroll = () => {
      if (syncTimeout) clearTimeout(syncTimeout)
      cellsEl.scrollTop = propsEl.scrollTop
      syncTimeout = setTimeout(() => {
        cellsEl.scrollTop = propsEl.scrollTop
      }, 50)
    }

    const handleCellsScroll = () => {
      if (syncTimeout) clearTimeout(syncTimeout)
      propsEl.scrollTop = cellsEl.scrollTop
      syncTimeout = setTimeout(() => {
        propsEl.scrollTop = cellsEl.scrollTop
      }, 50)
    }

    propsEl.addEventListener('scroll', handlePropsScroll, { passive: true })
    cellsEl.addEventListener('scroll', handleCellsScroll, { passive: true })

    return () => {
      if (syncTimeout) clearTimeout(syncTimeout)
      propsEl.removeEventListener('scroll', handlePropsScroll)
      cellsEl.removeEventListener('scroll', handleCellsScroll)
    }
  }, [])

  const startContinuousScroll = (direction: 'prev' | 'next') => {
    // Clear any existing interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
    }

    // Start continuous scroll
    scrollIntervalRef.current = setInterval(() => {
      setWeekIndex(current => {
        if (direction === 'prev' && current > 0) return current - 1
        if (direction === 'next' && current < 25) return current + 1 // 25 weeks ~= 6 months
        return current
      })
    }, 150) // Update every 150ms for smooth continuous scroll
  }

  const stopContinuousScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
  }

  const handleCellClick = (propertyId: string, dayIndex: number, event: React.MouseEvent) => {
    const key = `${propertyId}-${dayIndex}`

    if (event.shiftKey && lastSelectedDay) {
      // Shift+click: select range
      const [lastProp, lastDay] = lastSelectedDay.split('-')
      const lastDayIdx = parseInt(lastDay)
      const newSelected = new Set(selectedDays)

      const start = Math.min(dayIndex, lastDayIdx)
      const end = Math.max(dayIndex, lastDayIdx)

      // Only select days from same property
      if (lastProp === propertyId) {
        for (let i = start; i <= end; i++) {
          newSelected.add(`${propertyId}-${i}`)
        }
      }
      setSelectedDays(newSelected)
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+click: toggle selection
      const newSelected = new Set(selectedDays)
      if (newSelected.has(key)) {
        newSelected.delete(key)
      } else {
        newSelected.add(key)
      }
      setSelectedDays(newSelected)
    } else {
      // Regular click: select only this day
      setSelectedDays(new Set([key]))
    }

    setLastSelectedDay(key)

    // Open modal with first selected day
    const firstSelected = [...(event.shiftKey || event.ctrlKey || event.metaKey ? selectedDays : new Set([key]))][0]
    const [prop, day] = firstSelected.split('-')
    setEditingCell({ propertyId: prop, dayIndex: parseInt(day) })
    setEditPrice(prices[firstSelected]?.toString() || '145')
    setEditAvailability(availability[firstSelected] || 'available')
    setEditMinNights(minNights[firstSelected]?.toString() || '1')
  }

  const handleSavePrice = () => {
    if (selectedDays.size === 0) return

    const newPrices = { ...prices }
    const newAvailability = { ...availability }
    const newMinNights = { ...minNights }

    // Apply to all selected days
    selectedDays.forEach(key => {
      if (editPrice) newPrices[key] = parseFloat(editPrice)
      newAvailability[key] = editAvailability
      if (editMinNights) newMinNights[key] = parseInt(editMinNights) || 1
    })

    setPrices(newPrices)
    setAvailability(newAvailability)
    setMinNights(newMinNights)
    setEditingCell(null)
    setSelectedDays(new Set())
  }

  const getPrice = (propertyId: string, dayIndex: number) => {
    const key = `${propertyId}-${dayIndex}`
    return prices[key] ? `€${prices[key].toFixed(2)}` : '€145'
  }

  // Cleanup on unmount and stop on document mouseup
  useEffect(() => {
    const handleMouseUp = () => stopContinuousScroll()
    const handleTouchEnd = () => stopContinuousScroll()

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleTouchEnd)
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current)
      }
    }
  }, [])


  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [month, yearStr] = e.target.value.split('-')
    const selectedDate = new Date(parseInt(yearStr), parseInt(month), 15)

    // Calculate weeks from base date
    const weeksFromBase = Math.floor(
      (selectedDate.getTime() - baseDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )
    setWeekIndex(Math.max(0, Math.min(12, weeksFromBase)))
  }

  const propertiesToShow = selectedPropertyId
    ? properties.filter(p => p.id === selectedPropertyId)
    : properties

  return (
    <div className="calendar-kanban-view">
      {/* Header with month dropdown and navigation */}
      <div className="kanban-header">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#ffffff',
              border: '1px solid #efeadf',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1b2430',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f7f5ef'
              e.currentTarget.style.borderColor = '#cfc4aa'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.borderColor = '#efeadf'
            }}
          >
            ← Dashboard
          </button>

          <div className="month-selector">
            <select
              value={`${currentWeekStart.getMonth()}-${currentWeekStart.getFullYear()}`}
              onChange={handleMonthChange}
              className="month-dropdown"
            >
              {Array.from({ length: 36 }, (_, i) => {
                const date = new Date(2026, i, 1)
                const m = date.getMonth()
                const y = date.getFullYear()
                return (
                  <option key={i} value={`${m}-${y}`}>
                    {MONTHS[m]} de {y}
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {/* Navigation arrows and month display */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button
            className="week-nav-button"
            onMouseDown={() => startContinuousScroll('prev')}
            onTouchStart={() => startContinuousScroll('prev')}
            disabled={weekIndex === 0}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              border: '1px solid #efeadf',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#1b2430',
              transition: 'all 0.2s',
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1b2430',
            textTransform: 'capitalize',
            minWidth: '100px',
            textAlign: 'center',
          }}>
            {monthDisplay}
          </div>
          <button
            className="week-nav-button"
            onMouseDown={() => startContinuousScroll('next')}
            onTouchStart={() => startContinuousScroll('next')}
            disabled={weekIndex >= 12}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              border: '1px solid #efeadf',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#1b2430',
              transition: 'all 0.2s',
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Kanban timeline - horizontal scrolling */}
      <div className="kanban-container">
        <div className="kanban-wrapper">
          {/* Left column: property names or config panel */}
          <div className="kanban-properties-column" ref={propertiesColumnRef}>
            {selectedProperty ? (
              // Configuration panel
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
                <button
                  onClick={() => setSelectedProperty(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    marginBottom: '12px',
                    textAlign: 'left',
                  }}
                >
                  ← Voltar
                </button>

                {/* Property info */}
                {properties.find(p => p.id === selectedProperty) && (
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1b2430' }}>
                      {properties.find(p => p.id === selectedProperty)?.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#4d5566' }}>
                      {properties.find(p => p.id === selectedProperty)?.type}
                    </p>
                  </div>
                )}

                {/* Config tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #eee' }}>
                  {(['preco', 'desconto', 'disponibilidade', 'cancelamentos'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setConfigTab(tab)}
                      style={{
                        background: configTab === tab ? '#1b2430' : 'transparent',
                        color: configTab === tab ? 'white' : '#4d5566',
                        border: 'none',
                        padding: '8px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        borderBottom: configTab === tab ? '2px solid #1b2430' : 'none',
                      }}
                    >
                      {tab === 'preco' && 'Preços'}
                      {tab === 'desconto' && 'Descontos'}
                      {tab === 'disponibilidade' && 'Disponibilidade'}
                      {tab === 'cancelamentos' && 'Cancelamentos'}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {configTab === 'preco' && (
                  <div style={{ fontSize: '13px', color: '#4d5566' }}>
                    <p>80 € – 190 € por noite</p>
                  </div>
                )}

                {configTab === 'desconto' && (
                  <div style={{ fontSize: '13px', color: '#4d5566' }}>
                    <p>Desconto mensal de 55%</p>
                  </div>
                )}

                {configTab === 'disponibilidade' && (
                  <div style={{ fontSize: '13px', color: '#4d5566' }}>
                    <p>Estadias de 3 a 90 noites</p>
                  </div>
                )}

                {configTab === 'cancelamentos' && (
                  <div style={{ fontSize: '13px', color: '#4d5566' }}>
                    <p>Firme for short-term stays</p>
                  </div>
                )}

                {/* Minimum nights */}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                    Mínimo de Noites
                  </label>
                  <input
                    type="number"
                    value={propertyMinNights[selectedProperty] || 1}
                    onChange={(e) =>
                      setPropertyMinNights({
                        ...propertyMinNights,
                        [selectedProperty]: parseInt(e.target.value) || 1,
                      })
                    }
                    min="1"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            ) : (
              // Properties list
              <>
                <div className="property-label-header">
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1b2430', textAlign: 'center' }}>
                    {propertiesToShow.length} Propriedades
                  </div>
                </div>
                {propertiesToShow.map(property => (
                  <div
                    key={property.id}
                    className="property-label-row"
                    onClick={() => onPropertyClick ? onPropertyClick(property.id) : setSelectedProperty(property.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {property.imageUrl ? (
                      <img src={property.imageUrl} alt={property.name} />
                    ) : (
                      <div className="label-placeholder">📷</div>
                    )}
                    <div className="label-text">
                      <div className="label-name">{property.name}</div>
                      <div className="label-type">{property.type}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Scrollable calendar grid */}
          <div className="kanban-scroll-area">
            {/* Day headers with scroll */}
            <div className="kanban-days-header" ref={daysHeaderRef}>
              {allDays.map((date, idx) => (
                <div key={idx} className="day-header-cell">
                  <div className="day-abbr">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][date.getDay()]}
                  </div>
                  <div className="day-number">{date.getDate()}</div>
                </div>
              ))}
            </div>

            {/* Calendar cells grid with scroll */}
            <div className="kanban-cells-grid" ref={cellsGridRef}>
              {propertiesToShow.map(property => (
                <div key={property.id} className="kanban-row">
                  {allDays.map((date, idx) => {
                    const key = `${property.id}-${idx}`
                    const isSelected = selectedDays.has(key)
                    const reservation = getReservationForDate(property.id, date)
                    const isBooked = !!reservation
                    return (
                      <div
                        key={idx}
                        className="kanban-cell"
                        onClick={(e) => !isBooked && handleCellClick(property.id, idx, e)}
                        style={{
                          cursor: isBooked ? 'not-allowed' : 'pointer',
                          background: isBooked ? '#10203E' : isSelected ? '#e8f0fe' : '#ffffff',
                          borderLeft: isReservationStart(property.id, date) ? '2px solid #ffffff' : isSelected ? '3px solid #1b2430' : 'none',
                          borderRight: isReservationEnd(property.id, date) ? '2px solid #ffffff' : 'none',
                          borderRadius: isReservationStart(property.id, date) ? '6px 0 0 6px' : isReservationEnd(property.id, date) ? '0 6px 6px 0' : '0',
                          opacity: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          padding: '6px',
                          textAlign: 'center',
                        }}
                      >
                        {isBooked && reservation ? (
                          <>
                            <div style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              color: '#ffffff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '88px',
                              minWidth: '88px',
                              width: '88px',
                              lineHeight: '1.1',
                              height: 'auto',
                            }}>
                              {reservation.guestName}
                            </div>
                            <div style={{
                              fontSize: '9px',
                              color: '#ffffff',
                              opacity: 0.85,
                              lineHeight: '1',
                              minHeight: '10px',
                            }}>
                              {reservation.guestCount || 1} hosp.
                            </div>
                          </>
                        ) : (
                          <div className="cell-price">{getPrice(property.id, idx)}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Edit day configuration modal */}
            {editingCell && (
              <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: '400px',
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#1b2430' }}>
                  Configurar {selectedDays.size === 1 ? 'Dia' : `${selectedDays.size} Dias`}
                </h3>
                {selectedDays.size > 1 && (
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#4d5566' }}>
                    As alterações serão aplicadas a todos os {selectedDays.size} dias selecionados
                  </p>
                )}

                {/* Price */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#1b2430' }}>
                    Preço Diário (€)
                  </label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="145"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Availability */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#1b2430' }}>
                    Disponibilidade
                  </label>
                  <select
                    value={editAvailability}
                    onChange={(e) => setEditAvailability(e.target.value as 'available' | 'blocked')}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="available">Disponível</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                </div>

                {/* Configuração Personalizada */}
                <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#1b2430', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>
                    Configuração Personalizada
                  </h4>

                  {/* Minimum Nights */}
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#1b2430' }}>
                    Mínimo de Noites
                  </label>
                  <input
                    type="number"
                    value={editMinNights}
                    onChange={(e) => setEditMinNights(e.target.value)}
                    placeholder="1"
                    min="1"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                  <button
                    onClick={handleSavePrice}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#1b2430',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingCell(null)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#eee',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Overlay for modal */}
            {editingCell && (
              <div
                onClick={() => setEditingCell(null)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.3)',
                  zIndex: 999,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
