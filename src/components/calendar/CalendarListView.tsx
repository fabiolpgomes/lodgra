'use client'

import { useState } from 'react'
import { MinimumOverrideBadge } from './MinimumOverrideBadge'

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
  status: string
  notes?: string | null
}

interface CalendarListViewProps {
  properties: Property[]
  reservations: Reservation[]
  onPropertySelect: (propertyId: string) => void
}

export function CalendarListView({
  properties,
  reservations,
  onPropertySelect,
}: CalendarListViewProps) {
  const getReservationCount = (propertyId: string) => {
    return reservations.filter(r => r.propertyId === propertyId).length
  }

  const getNextReservation = (propertyId: string) => {
    const now = new Date()
    const future = reservations
      .filter(r => r.propertyId === propertyId && new Date(r.startDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    return future[0]
  }

  return (
    <div className="calendar-list-view">
      <div className="calendar-list-header px-4 pt-4 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1B2430] sm:text-3xl">Calendários</h1>
      </div>

      <div className="calendar-list-container px-4 pb-4 pt-3 sm:px-6">
        {properties.map(property => {
          const resCount = getReservationCount(property.id)
          const nextRes = getNextReservation(property.id)
          const nextResNotes = nextRes?.notes || ''
          const minimumOverrideMatch = nextResNotes.match(
            /Exceção aprovada para mínimo de noites:\s*(\d+)\s*noites?/i
          )
          const hasApprovedMinimumOverride = Boolean(minimumOverrideMatch)

          return (
            <div
              key={property.id}
              className="calendar-list-card mb-3 flex cursor-pointer flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:p-5"
              onClick={() => onPropertySelect(property.id)}
            >
              <div className="card-image shrink-0 overflow-hidden rounded-xl bg-[#F7F5EF] sm:h-20 sm:w-24">
                {property.imageUrl ? (
                  <img src={property.imageUrl} alt={property.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-40 items-center justify-center text-3xl sm:h-full">📷</div>
                )}
              </div>

              <div className="card-content min-w-0 flex-1">
                <h3 className="card-name truncate text-lg font-semibold text-[#1B2430]">{property.name}</h3>
                <p className="card-type mt-1 text-sm font-medium text-[#4D5566]">{property.type}</p>
                <p className="card-location truncate text-sm text-[#717171]">{property.location}</p>
                {resCount > 0 ? (
                  <span className="card-reservations mt-2 block text-sm font-medium text-[#10203E]">
                    📅 {resCount} reserva{resCount !== 1 ? 's' : ''}
                    {nextRes && ` • Próxima: ${new Date(nextRes.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                  </span>
                ) : (
                  <span className="card-status mt-2 block text-sm font-medium text-emerald-700">Disponível</span>
                )}
                {hasApprovedMinimumOverride && (
                  <div className="mt-2">
                    <MinimumOverrideBadge minimumNights={minimumOverrideMatch?.[1] || '-'} />
                  </div>
                )}
              </div>

              <div className="card-badge flex items-center justify-start sm:justify-end">
                {resCount > 0 ? (
                  <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-[#10203E] px-3 text-sm font-semibold text-white">
                    {resCount}
                  </span>
                ) : (
                  <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-emerald-100 px-3 text-sm font-semibold text-emerald-700">
                    ✓
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
