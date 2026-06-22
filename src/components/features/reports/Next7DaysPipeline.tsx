'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface Reservation {
  id: string
  check_in: string
  check_out: string
  status: 'confirmed' | 'pending' | 'cancelled'
  property_listings?: Array<{
    properties?: Array<{
      id: string
      name: string
    }>
  }>
  guests?: Array<{
    first_name: string
    last_name: string
  }>
}

export interface Property {
  id: string
  name: string
}

interface Next7DaysPipelineProps {
  reservations: Reservation[]
  properties: Property[]
  propertyId?: string
  startDate: string
  _endDate: string
}

export function Next7DaysPipeline({
  reservations,
  properties,
  propertyId,
  startDate,
  _endDate,
}: Next7DaysPipelineProps) {
  const [expandedReservations, setExpandedReservations] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedReservations)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedReservations(newSet)
  }

  const { days, propertyReservations } = useMemo(() => {
    // Parse start date as UTC
    const startParts = startDate.split('-')
    const start = new Date(Date.UTC(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2])))

    const dayArray: Date[] = []
    const currentDate = new Date(start)
    for (let i = 0; i < 7; i++) {
      dayArray.push(new Date(currentDate))
      currentDate.setUTCDate(currentDate.getUTCDate() + 1)
    }

    const periodicProperties = propertyId
      ? properties.filter((p) => p.id === propertyId)
      : properties

    const propResMap: Record<string, Record<number, Reservation[]>> = {}

    periodicProperties.forEach((prop) => {
      propResMap[prop.id] = {}
      for (let i = 0; i < 7; i++) {
        propResMap[prop.id][i] = []
      }
    })

    reservations.forEach((r) => {
      // Parse check-in/check-out as UTC dates
      const checkInParts = r.check_in.split('T')[0].split('-')
      const checkIn = new Date(Date.UTC(parseInt(checkInParts[0]), parseInt(checkInParts[1]) - 1, parseInt(checkInParts[2])))

      const checkOutParts = r.check_out.split('T')[0].split('-')
      const checkOut = new Date(Date.UTC(parseInt(checkOutParts[0]), parseInt(checkOutParts[1]) - 1, parseInt(checkOutParts[2])))

      const propId = r.property_listings?.[0]?.properties?.[0]?.id || ''

      for (let i = 0; i < 7; i++) {
        const dayStart = dayArray[i]
        const dayEnd = new Date(dayStart)
        dayEnd.setDate(dayEnd.getDate() + 1)

        if (checkIn < dayEnd && checkOut > dayStart) {
          if (propResMap[propId] && propResMap[propId][i]) {
            propResMap[propId][i].push(r)
          }
        }
      }
    })

    return { days: dayArray, propertyReservations: propResMap }
  }, [startDate, _endDate, reservations, properties, propertyId])

  const getStatusColor = (reservation: Reservation) => {
    if (reservation.status === 'confirmed') return 'bg-blue-200'
    if (reservation.status === 'pending') return 'bg-yellow-200'
    return 'bg-gray-200'
  }

  const getGuestName = (r: Reservation) => {
    if (Array.isArray(r.guests) && r.guests.length > 0 && 'first_name' in r.guests[0]) {
      return `${r.guests[0].first_name} ${r.guests[0].last_name || ''}`
    }
    return 'Hóspede'
  }

  const periodicProperties = propertyId
    ? properties.filter((p) => p.id === propertyId)
    : properties

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-6 text-xl font-semibold">Pipeline 7 Dias</h2>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="mb-4 grid grid-cols-[150px_repeat(7,1fr)] gap-2">
            <div className="font-semibold text-gray-600">Propriedade</div>
            {days.map((day, i) => {
              const dayName = day.toUTCString().split(' ')[0]
              const dayNum = day.getUTCDate()
              const monthNum = day.getUTCMonth() + 1
              return (
                <div key={i} className="text-center text-sm font-semibold text-gray-600">
                  <p>{dayName}</p>
                  <p className="text-xs">{dayNum}/{monthNum}</p>
                </div>
              )
            })}
          </div>

          {periodicProperties.map((prop) => (
            <div key={prop.id} className="mb-3 grid grid-cols-[150px_repeat(7,1fr)] gap-2">
              <div className="truncate text-sm font-medium text-gray-700">{prop.name}</div>

              {days.map((_, dayIndex) => {
                const dayReservations = propertyReservations[prop.id]?.[dayIndex] || []

                return (
                  <div
                    key={dayIndex}
                    className="min-h-[60px] rounded border border-gray-200 bg-gray-50 p-1"
                  >
                    {dayReservations.map((res) => (
                      <button
                        key={res.id}
                        onClick={() => toggleExpanded(res.id)}
                        className={`w-full truncate rounded px-1 py-0.5 text-xs font-semibold text-gray-900 mb-1 block ${getStatusColor(res)}`}
                      >
                        {getGuestName(res)}
                      </button>
                    ))}

                    {dayReservations.map((res) => (
                      <div
                        key={`expanded-${res.id}`}
                        className={`rounded border border-gray-300 bg-white p-2 mt-2 ${expandedReservations.has(res.id) ? 'block' : 'hidden'}`}
                      >
                        <div className="space-y-1 text-xs">
                          <div>
                            <p className="font-semibold">{getGuestName(res)}</p>
                            <p className="text-gray-500">
                              {new Date(res.check_in).toLocaleDateString('pt-PT')} →{' '}
                              {new Date(res.check_out).toLocaleDateString('pt-PT')}
                            </p>
                          </div>
                          <p className="text-gray-600 capitalize">{res.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-blue-200" />
          <span>Confirmada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-yellow-200" />
          <span>Pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-gray-200" />
          <span>Cancelada</span>
        </div>
      </div>
    </div>
  )
}
