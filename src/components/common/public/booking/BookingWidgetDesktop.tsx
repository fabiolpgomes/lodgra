'use client'

import { AvailabilityCalendar } from '@/components/common/public/AvailabilityCalendar'
import { PropertyTrustBadges } from '@/components/common/public/layout/PropertyTrustBadges'

interface BookingWidgetDesktopProps {
  slug: string
  basePrice: number
  minNights?: number
}

export function BookingWidgetDesktop({ slug, basePrice, minNights }: BookingWidgetDesktopProps) {
  const priceLabel = basePrice > 0 ? `${basePrice.toLocaleString('pt-PT')} €` : null

  return (
    <div
      className="sticky top-20 rounded-2xl border border-lodgra-neutral-200 bg-white p-6 space-y-5"
      style={{ boxShadow: 'var(--shadow-booking, 0 8px 32px 0 rgba(0,0,0,0.10))' }}
    >
      {/* Price */}
      {priceLabel && (
        <div>
          <span className="text-2xl font-bold text-lodgra-neutral-900">{priceLabel}</span>
          <span className="text-sm text-lodgra-neutral-500 ml-1">/ noite</span>
        </div>
      )}

      {/* Calendar */}
      <AvailabilityCalendar slug={slug} basePrice={basePrice} minNights={minNights} />

      {/* Trust */}
      <PropertyTrustBadges />
    </div>
  )
}
