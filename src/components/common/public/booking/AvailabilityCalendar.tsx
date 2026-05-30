'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, format, parseISO, isAfter, isBefore,
  isSameDay, startOfDay, getDay, addDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AvailabilityCalendarProps {
  blockedRanges?: { start: string; end: string }[]
  minNights?: number
  checkIn: string
  checkOut: string
  onCheckInChange: (date: string) => void
  onCheckOutChange: (date: string) => void
}

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function fmt(d: Date) { return format(d, 'yyyy-MM-dd') }
function parse(s: string) { return parseISO(s) }

function isDateBlocked(date: Date, ranges: { start: string; end: string }[]): boolean {
  const d = fmt(date)
  return ranges.some(r => d >= r.start && d < r.end)
}

function doesRangeOverlapBlocked(start: Date, end: Date, ranges: { start: string; end: string }[]): boolean {
  const s = fmt(start), e = fmt(end)
  return ranges.some(r => s < r.end && e > r.start)
}

interface MonthProps {
  baseDate: Date
  today: Date
  checkIn: string
  checkOut: string
  hoverDate: string | null
  blockedRanges: { start: string; end: string }[]
  onDateClick: (d: Date) => void
  onDateHover: (d: string | null) => void
  minNights: number
}

function MonthGrid({ baseDate, today, checkIn, checkOut, hoverDate, blockedRanges, onDateClick, onDateHover, minNights }: MonthProps) {
  const monthStart = startOfMonth(baseDate)
  const monthEnd = endOfMonth(baseDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // ISO week starts Monday (1), offset 0-6
  const firstDow = (getDay(monthStart) + 6) % 7 // Mon=0, Sun=6
  const paddingDays = Array.from({ length: firstDow })

  return (
    <div className="flex-1 min-w-0">
      <p className="text-center text-[14px] font-bold text-gray-900 mb-3 capitalize">
        {format(baseDate, 'MMMM yyyy', { locale: ptBR })}
      </p>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {WEEK_DAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const d = fmt(day)
          const isPast = isBefore(startOfDay(day), startOfDay(today))
          const isBlocked = isDateBlocked(day, blockedRanges)
          const isCI = checkIn && d === checkIn
          const isCO = checkOut && d === checkOut
          const isToday = isSameDay(day, today)

          // Is in selected range?
          const inRange = checkIn && checkOut && d > checkIn && d < checkOut

          // Is in hover preview range?
          const effectiveEnd = hoverDate || checkOut
          const inHover = checkIn && !checkOut && hoverDate &&
            ((d > checkIn && d <= hoverDate) || (d < checkIn && d >= hoverDate))

          const isDisabled = isPast || isBlocked ||
            // If checkIn selected, disable dates that would create invalid range
            (checkIn && !checkOut && d !== checkIn && isAfter(parse(checkIn), addDays(parse(d), -1)) === false &&
              doesRangeOverlapBlocked(parse(checkIn), parse(d), blockedRanges))

          let cellClass = 'relative h-9 flex items-center justify-center text-[13px] select-none cursor-default transition-colors '

          if (isPast || isBlocked) {
            cellClass += 'text-gray-300 cursor-not-allowed '
          } else if (isCI || isCO) {
            cellClass += 'bg-brand-800 text-white rounded-full font-bold cursor-pointer z-10 shadow-md border-2 border-brand-600 '

          } else if (inRange) {
            // Check if range is too short
            const rangeNights = Math.round((parse(checkOut).getTime() - parse(checkIn).getTime()) / 86400000)
            const isInvalidRange = rangeNights < minNights
            cellClass += isInvalidRange ? 'bg-amber-100 text-amber-900 ' : 'bg-brand-100 text-brand-900 '
          } else if (inHover) {
            cellClass += 'bg-brand-50 text-brand-800 '
          } else {
            cellClass += 'text-gray-800 hover:bg-brand-50 hover:text-brand-800 cursor-pointer rounded-full '
          }

          if (isToday && !isCI && !isCO) {
            cellClass += 'font-bold underline underline-offset-2 '
          }

          // Round range ends
          const isRangeStart = (inRange || inHover) && (d === checkIn || (hoverDate && d === checkIn))
          const isRangeEnd = inRange && d === checkOut

          return (
            <div
              key={d}
              className={`${cellClass} ${isRangeStart ? 'rounded-l-full' : ''} ${isRangeEnd ? 'rounded-r-full' : ''}`}
              onClick={() => !isPast && !isBlocked && onDateClick(day)}
              onMouseEnter={() => !isPast && !isBlocked && onDateHover(d)}
              onMouseLeave={() => onDateHover(null)}
              aria-label={`${format(day, 'd MMMM yyyy', { locale: ptBR })}${isBlocked ? ' — reservado' : isPast ? ' — passado' : ''}`}
              role="button"
              tabIndex={isPast || isBlocked ? -1 : 0}
              onKeyDown={e => e.key === 'Enter' && !isPast && !isBlocked && onDateClick(day)}
            >
              <span className={`${isCI || isCO ? 'z-10 relative' : ''}`}>
                {format(day, 'd')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AvailabilityCalendar({
  blockedRanges = [],
  minNights = 1,
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
}: AvailabilityCalendarProps) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const [baseMonth, setBaseMonth] = useState(() => startOfMonth(today))
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const nextMonth = addMonths(baseMonth, 1)

  const handleDateClick = (day: Date) => {
    const d = fmt(day)

    if (!checkIn || (checkIn && checkOut)) {
      // Start new selection
      onCheckInChange(d)
      onCheckOutChange('')
      return
    }

    // checkIn set, no checkOut yet
    if (d === checkIn) {
      // Click same day — reset
      onCheckInChange('')
      onCheckOutChange('')
      return
    }

    if (isBefore(day, parse(checkIn))) {
      // Clicked before checkIn — make it new checkIn
      onCheckInChange(d)
      return
    }

    // Clicked after checkIn — validate
    const nights = Math.round((day.getTime() - parse(checkIn).getTime()) / 86400000)
    if (nights < minNights) return // too short

    if (doesRangeOverlapBlocked(parse(checkIn), day, blockedRanges)) return // overlaps reservation

    onCheckOutChange(d)
    setHoverDate(null)
  }

  const hasSelection = checkIn || checkOut
  const nightsCount = checkIn && checkOut
    ? Math.round((parse(checkOut).getTime() - parse(checkIn).getTime()) / 86400000)
    : null

  return (
    <section className="border-t border-gray-200 pt-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-900">Disponibilidade</h2>
        {hasSelection && (
          <button
            onClick={() => { onCheckInChange(''); onCheckOutChange('') }}
            className="text-[13px] text-brand-800 hover:underline font-medium"
          >
            Limpar datas
          </button>
        )}
      </div>

      <div className="mb-5">
        <p className="text-sm text-gray-500">
          {!checkIn && 'Clique numa data de entrada para começar'}
          {checkIn && !checkOut && 'Agora clique na data de saída'}
          {checkIn && checkOut && nightsCount && (
            <span className="text-brand-800 font-medium">
              {format(parse(checkIn), 'd MMM', { locale: ptBR })} → {format(parse(checkOut), 'd MMM yyyy', { locale: ptBR })} · {nightsCount} {nightsCount === 1 ? 'noite' : 'noites'}
            </span>
          )}
        </p>
        {checkIn && checkOut && nightsCount && nightsCount < minNights && (
          <p className="mt-2 text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 inline-block">
            ⚠️ Período mínimo: {minNights} {minNights === 1 ? 'noite' : 'noites'}. Actualmente: {nightsCount} {nightsCount === 1 ? 'noite' : 'noites'}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setBaseMonth(m => subMonths(m, 1))}
          disabled={!isAfter(baseMonth, today)}
          className="p-2 text-gray-600 hover:text-brand-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-full hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setBaseMonth(m => addMonths(m, 1))}
          className="p-2 text-gray-600 hover:text-brand-800 rounded-full hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Two-month grid */}
      <div className="flex flex-col sm:flex-row gap-8">
        <MonthGrid
          baseDate={baseMonth}
          today={today}
          checkIn={checkIn}
          checkOut={checkOut}
          hoverDate={hoverDate}
          blockedRanges={blockedRanges}
          onDateClick={handleDateClick}
          onDateHover={setHoverDate}
          minNights={minNights}
        />
        <div className="hidden sm:block w-px bg-gray-200 shrink-0 self-stretch" />
        <MonthGrid
          baseDate={nextMonth}
          today={today}
          checkIn={checkIn}
          checkOut={checkOut}
          hoverDate={hoverDate}
          blockedRanges={blockedRanges}
          onDateClick={handleDateClick}
          onDateHover={setHoverDate}
          minNights={minNights}
        />
      </div>

      {/* Legend */}
      <div className="mt-5 flex items-center gap-6 text-[12px] text-gray-500 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-brand-800 inline-block" />
          Seleccionado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-gray-200 inline-block" />
          Reservado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-400 inline-block" />
          Hoje
        </span>
      </div>
    </section>
  )
}
