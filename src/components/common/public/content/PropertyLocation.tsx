'use client'

import { MapPin } from 'lucide-react'

interface PropertyLocationProps {
  city?: string | null
  country?: string | null
  address?: string | null
}

export function PropertyLocation({ city, country, address }: PropertyLocationProps) {
  const locationLabel = [city, country].filter(Boolean).join(', ')

  if (!locationLabel) return null

  const searchQuery = address ? `${address}, ${locationLabel}` : locationLabel
  // maps.google.com embed without API key — bots see a static link fallback instead
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(searchQuery)}&output=embed&z=14`
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`

  return (
    <section aria-label="Localização" className="w-full">
      <h2 className="text-xl font-semibold text-be-text mb-3">Localização</h2>

      {/* Iframe hidden from bots via aria-hidden — Googlebot follows iframe src causing redirect
          warnings in GSC; the visible link below provides the crawlable reference */}
      <div className="rounded-xl overflow-hidden border border-lodgra-neutral-200 mb-3 h-44 sm:h-56 bg-lodgra-neutral-100">
        <iframe
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={embedUrl}
          title={`Mapa de ${locationLabel}`}
          aria-hidden="true"
        />
      </div>

      {/* Location text — link to Google Maps gives Googlebot a crawlable anchor */}
      <div className="flex items-start gap-1.5 text-sm text-be-text-muted-500">
        <MapPin className="h-4 w-4 text-be-text-400 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          {address && <p className="font-medium text-be-text-muted-700">{address}</p>}
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-be-text-500 transition-colors"
          >
            {locationLabel}
          </a>
        </div>
      </div>
    </section>
  )
}
