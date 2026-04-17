'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { AvailabilityCalendar } from '@/components/public/AvailabilityCalendar'

interface BookingWidgetMobileProps {
  slug: string
  basePrice: number
  minNights?: number
}

export function BookingWidgetMobile({ slug, basePrice, minNights }: BookingWidgetMobileProps) {
  const [open, setOpen] = useState(false)
  const priceLabel = basePrice > 0 ? `${basePrice.toLocaleString('pt-PT')} €/noite` : 'Ver disponibilidade'

  return (
    <>
      {/* Bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-lodgra-neutral-200 px-4 py-3 flex items-center justify-between gap-3 safe-area-pb">
        <div>
          {basePrice > 0 && (
            <p className="text-base font-bold text-lodgra-neutral-900">
              {basePrice.toLocaleString('pt-PT')} €
              <span className="text-xs font-normal text-lodgra-neutral-500 ml-1">/ noite</span>
            </p>
          )}
          <p className="text-xs text-lodgra-neutral-500">Sem comissões</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex-1 max-w-[180px] py-3 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--lodgra-cta-bg)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--lodgra-cta-bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--lodgra-cta-bg)')}
        >
          Reservar agora
        </button>
      </div>

      {/* Sheet / modal */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-lodgra-neutral-900">
                {priceLabel}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AvailabilityCalendar slug={slug} basePrice={basePrice} minNights={minNights} />
          </div>
        </>
      )}
    </>
  )
}
