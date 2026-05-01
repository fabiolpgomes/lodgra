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

  // Use API-key-free Google Maps embed format
  const searchQuery = address ? `${address}, ${locationLabel}` : locationLabel
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(searchQuery)}&output=embed&z=14`

  return (
    <section aria-label="Localização" className="w-full">
      <h2 className="text-xl font-semibold text-lodgra-neutral-900 mb-3">Localização</h2>

      {/* Google Maps Embed — no API key required */}
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
        />
      </div>

      {/* Location text */}
      <div className="flex items-start gap-1.5 text-sm text-lodgra-neutral-500">
        <MapPin className="h-4 w-4 text-lodgra-brand-400 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          {address && <p className="font-medium text-lodgra-neutral-700">{address}</p>}
          <p>{locationLabel}</p>
        </div>
      </div>
    </section>
  )
}
