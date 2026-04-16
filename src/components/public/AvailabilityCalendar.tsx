'use client'

import { useState, useEffect, useCallback } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import { format, differenceInDays, isBefore, startOfDay, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import 'react-day-picker/style.css'

interface AvailabilityCalendarProps {
  slug: string
  basePrice: number
  minNights?: number
}

interface AvailabilityData {
  blocked: string[]
  base_price: number
  min_nights: number
}

interface PricingData {
  total: number
  breakdown: { date: string; price: number }[]
  minNights: number
}

export function AvailabilityCalendar({ slug, basePrice, minNights = 1 }: AvailabilityCalendarProps) {
  const [month, setMonth] = useState<Date>(new Date())
  const [range, setRange] = useState<DateRange | undefined>()
  const [blockedDates, setBlockedDates] = useState<Date[]>([])
  const [effectiveMinNights, setEffectiveMinNights] = useState(minNights)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pricingData, setPricingData] = useState<PricingData | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)

  const fetchAvailability = useCallback(async (date: Date) => {
    setLoading(true)
    setError(null)
    try {
      const year = date.getFullYear()
      const m = date.getMonth() + 1
      const res = await fetch(
        `/api/public/properties/${slug}/availability?year=${year}&month=${m}`
      )
      if (!res.ok) throw new Error('Erro ao carregar disponibilidade')
      const data: AvailabilityData = await res.json()

      setBlockedDates(data.blocked.map((d) => new Date(d + 'T00:00:00')))
      setEffectiveMinNights(data.min_nights ?? minNights)
    } catch {
      setError('Não foi possível carregar a disponibilidade.')
    } finally {
      setLoading(false)
    }
  }, [slug, minNights])

  const fetchPricing = useCallback(async (from: Date, to: Date) => {
    setLoadingPrice(true)
    try {
      const res = await fetch(
        `/api/public/properties/${slug}/pricing?checkin=${format(from, 'yyyy-MM-dd')}&checkout=${format(to, 'yyyy-MM-dd')}`
      )
      if (res.ok) {
        const data: PricingData = await res.json()
        setPricingData(data)
        if (data.minNights > effectiveMinNights) setEffectiveMinNights(data.minNights)
      } else {
        setPricingData(null)
      }
    } catch {
      setPricingData(null)
    } finally {
      setLoadingPrice(false)
    }
  }, [slug, effectiveMinNights])

  useEffect(() => {
    fetchAvailability(month)
  }, [month, fetchAvailability])

  const today = startOfDay(new Date())

  // Disable: past dates + blocked dates
  const isDisabled = (date: Date) => {
    if (isBefore(date, today)) return true
    const key = format(date, 'yyyy-MM-dd')
    return blockedDates.some((d) => format(d, 'yyyy-MM-dd') === key)
  }

  // When a range is selected, validate min nights and blocked dates between
  const handleSelect = (r: DateRange | undefined) => {
    if (!r?.from || !r?.to) {
      setRange(r)
      return
    }
    // Check no blocked date falls within selected range
    const nights = differenceInDays(r.to, r.from)
    if (nights < 1) {
      setRange({ from: r.from })
      return
    }
    // Ensure no blocked date is between from and to
    let current = addDays(r.from, 1)
    while (isBefore(current, r.to)) {
      if (isDisabled(current)) {
        setRange({ from: r.from })
        return
      }
      current = addDays(current, 1)
    }
    setRange(r)
    if (r?.from && r?.to) {
      setPricingData(null)
      fetchPricing(r.from, r.to)
    } else {
      setPricingData(null)
    }
  }

  const nights =
    range?.from && range?.to ? differenceInDays(range.to, range.from) : 0
  const isValidSelection =
    range?.from && range?.to && nights >= effectiveMinNights

  // Use pricingData.total if available, otherwise fallback to base price
  const estimatedTotal = pricingData?.total ?? (isValidSelection ? nights * basePrice : 0)

  const checkoutParams =
    isValidSelection && range?.from && range?.to
      ? `?checkin=${format(range.from, 'yyyy-MM-dd')}&checkout=${format(range.to, 'yyyy-MM-dd')}&guests=1`
      : ''

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-gray-200 inline-block" />
          Indisponível
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-gray-900 inline-block" />
          Seleccionado
        </span>
      </div>

      {/* Calendar */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
            className="rounded-full p-1 hover:bg-gray-100"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 min-w-[150px] text-center">
            {format(month, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <button
            onClick={() => setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
            className="rounded-full p-1 hover:bg-gray-100"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        <DayPicker
          mode="range"
          selected={range}
          onSelect={handleSelect}
          month={month}
          onMonthChange={(m) => setMonth(m)}
          locale={ptBR}
          disabled={isDisabled}
          numberOfMonths={1}
          showOutsideDays={false}
          classNames={{
            root: 'w-full',
            months: 'w-full',
            month_caption: 'hidden',
            nav: 'hidden',
            weekdays: 'grid grid-cols-7 mb-1',
            weekday: 'text-center text-xs text-gray-400 pb-1',
            weeks: 'space-y-1',
            week: 'grid grid-cols-7',
            day: 'text-center',
            day_button: 'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed',
            range_start: 'bg-gray-900 text-white rounded-l-full',
            range_end: 'bg-gray-900 text-white rounded-r-full',
            range_middle: 'bg-gray-100',
            selected: 'bg-gray-900 text-white',
            today: 'font-bold underline',
          }}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Selection summary */}
      {range?.from && !range?.to && (
        <p className="text-sm text-gray-500">
          Seleccione a data de check-out.
          {effectiveMinNights > 1 && ` Mínimo ${effectiveMinNights} noites.`}
        </p>
      )}

      {range?.from && range?.to && nights < effectiveMinNights && (
        <p className="text-sm text-amber-600">
          Mínimo de {effectiveMinNights} noites. Seleccionou {nights}.
        </p>
      )}

      {isValidSelection && (
        <div className="rounded-lg border border-gray-200 p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-700">
            <span>
              {format(range!.from!, 'dd/MM/yyyy')} → {format(range!.to!, 'dd/MM/yyyy')}
            </span>
            <span>{nights} noite{nights !== 1 ? 's' : ''}</span>
          </div>
              <div className="flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              {loadingPrice ? (
                <Loader2 size={14} className="animate-spin text-gray-400 mt-0.5" />
              ) : (
                <span>{estimatedTotal > 0 ? `${estimatedTotal.toFixed(2)} €` : '—'}</span>
              )}
            </div>
          <a
            href={`/p/${slug}/checkout${checkoutParams}`}
            className="mt-2 flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            Reservar agora
          </a>
        </div>
      )}
    </div>
  )
}
