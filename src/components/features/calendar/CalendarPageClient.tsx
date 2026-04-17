'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventDropArg, DateSelectArg, DatesSetArg } from '@fullcalendar/core'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/useAuth'
import { NewReservationModal } from './NewReservationModal'
import { createClient } from '@/lib/supabase/client'

interface Property {
  id: string
  name: string
}

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  color: string
}

function propertyColor(propertyId: string): string {
  let hash = 0
  for (let i = 0; i < propertyId.length; i++) {
    hash = (hash * 31 + propertyId.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  return `hsl(${hue}, 60%, 45%)`
}

export function CalendarPageClient() {
  const { role } = usePermissions()
  const isEditable = role === 'admin' || role === 'gestor'
  const calendarRef = useRef<InstanceType<typeof FullCalendar>>(null)
  const calendarWrapperRef = useRef<HTMLDivElement>(null)

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null)
  const [newResModal, setNewResModal] = useState<{ checkIn: string; checkOut: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [dayMaxEvents, setDayMaxEvents] = useState(3)
  const [swipeActive, setSwipeActive] = useState(false)

  // Calculate responsive dayMaxEvents based on screen width
  useEffect(() => {
    const calculateDayMaxEvents = () => {
      const width = typeof window !== 'undefined' ? window.innerWidth : 1024
      if (width < 640) {
        setDayMaxEvents(1)
      } else if (width < 1024) {
        setDayMaxEvents(2)
      } else {
        setDayMaxEvents(3)
      }
    }

    calculateDayMaxEvents()
    window.addEventListener('resize', calculateDayMaxEvents)
    return () => window.removeEventListener('resize', calculateDayMaxEvents)
  }, [])

  // Fetch properties on mount
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('properties')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setProperties(data)
      })
  }, [])

  // Fetch events when date range or property filter changes
  const fetchEvents = useCallback(async (from: string, to: string, propertyId: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      if (propertyId) params.set('property_id', propertyId)
      const res = await fetch(`/api/calendar/reservations?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setEvents(data)
    } catch {
      toast.error('Erro ao carregar reservas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (dateRange) {
      fetchEvents(dateRange.from, dateRange.to, selectedPropertyId)
    }
  }, [dateRange, selectedPropertyId, fetchEvents])

  const handleDatesSet = useCallback(({ startStr, endStr }: DatesSetArg) => {
    setDateRange({ from: startStr.slice(0, 10), to: endStr.slice(0, 10) })
  }, [])

  const handleEventDrop = useCallback(async ({ event, revert }: EventDropArg) => {
    if (!isEditable) { revert(); return }
    const check_in = event.startStr
    const check_out = event.endStr

    const res = await fetch(`/api/calendar/reservations/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ check_in, check_out }),
    })
    if (!res.ok) {
      const data = await res.json()
      revert()
      toast.error(data.error ?? 'Datas em conflito com outra reserva')
    } else {
      toast.success('Reserva movida com sucesso')
    }
  }, [isEditable])

  const handleDateSelect = useCallback(({ startStr, endStr }: DateSelectArg) => {
    if (!isEditable) return
    setNewResModal({ checkIn: startStr, checkOut: endStr })
  }, [isEditable])

  const handleSwipeLeft = useCallback(() => {
    setSwipeActive(true)
    calendarRef.current?.getApi().next()
    setTimeout(() => setSwipeActive(false), 300)
  }, [])

  const handleSwipeRight = useCallback(() => {
    setSwipeActive(true)
    calendarRef.current?.getApi().prev()
    setTimeout(() => setSwipeActive(false), 300)
  }, [])

  // Simple touch swipe detection
  useEffect(() => {
    const element = calendarWrapperRef.current
    if (!element) return

    let touchStartX = 0
    let touchStartY = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      const deltaX = touchEndX - touchStartX
      const deltaY = touchEndY - touchStartY

      // Only consider horizontal swipes with sufficient distance
      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < Math.abs(deltaX)) {
        if (deltaX > 0) {
          handleSwipeRight()
        } else {
          handleSwipeLeft()
        }
      }
    }

    element.addEventListener('touchstart', handleTouchStart, false)
    element.addEventListener('touchend', handleTouchEnd, false)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleSwipeLeft, handleSwipeRight])

  return (
    <div className="space-y-4 px-2 sm:px-3 md:px-4" ref={calendarWrapperRef}>
      {/* Header + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Calendário</h1>
          {!isEditable && (
            <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Modo leitura — sem permissão para modificar reservas</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {properties.length > 0 && (
            <select
              value={selectedPropertyId}
              onChange={e => setSelectedPropertyId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-[13px] sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] sm:min-h-auto"
            >
              <option value="">Todas as propriedades</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {loading && (
            <span className="text-[11px] sm:text-xs text-gray-500 py-2 sm:py-0">A carregar…</span>
          )}
        </div>
      </div>

      {/* Legend */}
      {properties.length > 0 && (
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {properties.slice(0, 8).map(p => (
            <div key={p.id} className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-gray-600">
              <span
                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: propertyColor(p.id) }}
              />
              <span className="truncate">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* FullCalendar */}
      <div className={`bg-white rounded-lg shadow p-2 sm:p-3 md:p-4 fc-wrapper transition-opacity duration-300 ${swipeActive ? 'opacity-75' : 'opacity-100'}`}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="pt"
          firstDay={1}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: dayMaxEvents === 1 ? '' : 'dayGridMonth,dayGridWeek',
          }}
          buttonText={{
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
          }}
          editable={isEditable}
          eventDurationEditable={false}
          selectable={isEditable}
          selectMirror={true}
          events={events}
          datesSet={handleDatesSet}
          eventDrop={handleEventDrop}
          select={handleDateSelect}
          dayMaxEvents={dayMaxEvents}
          displayEventTime={false}
          height="auto"
          contentHeight="auto"
          eventContent={({ event }) => (
            <div className={`px-1 sm:px-1.5 py-0.5 truncate text-[9px] sm:text-[10px] md:text-[11px] font-medium text-white leading-tight ${dayMaxEvents === 1 ? 'text-[8px]' : ''}`}>
              {event.extendedProps.status === 'pending' ? '⏳ ' : ''}{event.title}
            </div>
          )}
          eventDidMount={({ el, event }) => {
            el.title = event.title
            if (event.extendedProps.status === 'pending') {
              el.style.opacity = '0.7'
            }
          }}
        />

        <style>{`
          .fc-wrapper .fc-event {
            cursor: ${isEditable ? 'grab' : 'pointer'};
            border-radius: 4px;
            border: none;
            min-height: 24px;
          }
          .fc-wrapper .fc-event:active { cursor: grabbing; }
          .fc-wrapper .fc-daygrid-event {
            margin-bottom: 1px;
            min-height: 20px;
          }
          .fc-wrapper .fc-toolbar-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: #111827;
          }
          @media (min-width: 640px) {
            .fc-wrapper .fc-toolbar-title {
              font-size: 1rem;
            }
          }
          @media (min-width: 1024px) {
            .fc-wrapper .fc-toolbar-title {
              font-size: 1.25rem;
            }
          }
          .fc-wrapper .fc-button-primary {
            background-color: #3b82f6 !important;
            border-color: #3b82f6 !important;
            min-height: 44px !important;
            padding: 0.5rem 0.75rem !important;
            font-size: 0.75rem !important;
          }
          @media (min-width: 640px) {
            .fc-wrapper .fc-button-primary {
              min-height: 40px !important;
              padding: 0.5rem 1rem !important;
              font-size: 0.875rem !important;
            }
          }
          .fc-wrapper .fc-button-primary:hover {
            background-color: #2563eb !important;
            border-color: #2563eb !important;
          }
          .fc-wrapper .fc-button-primary:not(:disabled).fc-button-active {
            background-color: #1d4ed8 !important;
            border-color: #1d4ed8 !important;
          }
          .fc-wrapper .fc-col-header-cell {
            padding: 6px 2px;
            font-size: 0.65rem;
          }
          @media (min-width: 640px) {
            .fc-wrapper .fc-col-header-cell {
              padding: 8px 4px;
              font-size: 0.75rem;
            }
          }
          @media (min-width: 1024px) {
            .fc-wrapper .fc-col-header-cell {
              padding: 10px 6px;
              font-size: 0.875rem;
            }
          }
          .fc-wrapper .fc-daygrid-day {
            min-height: 60px;
          }
          @media (min-width: 640px) {
            .fc-wrapper .fc-daygrid-day {
              min-height: 80px;
            }
          }
          @media (min-width: 1024px) {
            .fc-wrapper .fc-daygrid-day {
              min-height: 100px;
            }
          }
          .fc-wrapper .fc-daygrid-day-number {
            padding: 4px 2px;
            font-size: 0.7rem;
          }
          @media (min-width: 640px) {
            .fc-wrapper .fc-daygrid-day-number {
              padding: 6px 4px;
              font-size: 0.875rem;
            }
          }
          .fc-wrapper .fc-highlight { background: #dbeafe !important; }
          .fc-wrapper .fc-day-today { background: #eff6ff !important; }
        `}</style>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-wrap gap-2 sm:gap-3">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-[#d97706] opacity-70 inline-block" />
            Pendente
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-blue-500 inline-block" />
            Confirmada
          </span>
        </div>
        {isEditable && (
          <p className="text-[10px] sm:text-xs text-gray-400">
            {dayMaxEvents === 1 ? 'Deslize para navegar · Toque para criar' : 'Arraste para mover · Clique num período para criar'}
          </p>
        )}
      </div>

      <NewReservationModal
        open={!!newResModal}
        checkIn={newResModal?.checkIn ?? ''}
        checkOut={newResModal?.checkOut ?? ''}
        properties={properties}
        onClose={() => setNewResModal(null)}
      />
    </div>
  )
}
