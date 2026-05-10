'use client'

import Link from 'next/link'
import Image from 'next/image'
import { getCurrencySymbol } from '@/lib/currency/symbols'

export interface PropertyCardProps {
  id: string
  slug: string
  name: string
  city: string
  country: string
  image: string
  price: number
  currency: string
  amenities: string[]
  bedrooms: number
  bathrooms: number
  maxGuests: number
  rating?: number
  reviewCount?: number
  isFeatured?: boolean
  checkIn?: string
  checkOut?: string
}

const AMENITY_ICONS: Record<string, string> = {
  pool: '🏊',
  wifi: '📶',
  ac: '❄️',
  kitchen: '🍳',
  parking: '🚗',
  washer: '🧺',
  pets: '🐕',
  heating: '🔥',
}

function AmenityIcon({ type, className = '' }: { type: string; className?: string }) {
  const icon = AMENITY_ICONS[type] || '✓'
  return (
    <span className={`text-[16px] opacity-70 grayscale ${className}`} title={type}>
      {icon}
    </span>
  )
}

export function PropertyCard({
  id,
  slug,
  name,
  city,
  country,
  image,
  price,
  currency,
  amenities,
  bedrooms,
  bathrooms,
  maxGuests,
  rating,
  reviewCount,
  isFeatured,
  checkIn,
  checkOut,
}: PropertyCardProps) {
  const currencySymbol = getCurrencySymbol(currency)
  const displayAmenities = amenities.slice(0, 3)

  const href = checkIn && checkOut
    ? `/p/${slug}?checkIn=${checkIn}&checkOut=${checkOut}`
    : `/p/${slug}`

  return (
    <div
      className="bg-[#ffffff] rounded-none border border-[#e6e6e6] flex flex-col h-full hover:border-[#262626] transition-colors group"
      data-testid={`property-card-${id}`}
    >
      {/* Image Container */}
      <div className="relative w-full aspect-[4/3] bg-[#fafafa] overflow-hidden flex items-center justify-center p-[4px]">
        {image ? (
          <Image
            src={image}
            alt={name}
            width={1440}
            height={1080}
            loading="lazy"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 48vw, 25vw"
            className="w-full h-full object-cover rounded-none"
          />
        ) : (
          <div className="text-[#9a9a9a] text-[32px]">🏠</div>
        )}
        {isFeatured && (
          <div className="absolute top-4 left-4 bg-[#1a2129] text-[#ffffff] px-[12px] py-[6px] rounded-none text-[10px] font-bold uppercase tracking-[1.5px]">
            Destaque
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="p-[24px] flex flex-col flex-1">
        {/* Title + Location */}
        <div className="mb-[16px]">
          <h3 className="font-bold text-[18px] text-[#262626] line-clamp-2 leading-[1.4] mb-1">
            {name}
          </h3>
          <p className="text-[14px] font-light text-[#6b6b6b] flex items-center gap-1">
            {city}, {country}
          </p>
        </div>

        {/* Specs */}
        <div className="flex gap-[16px] text-[14px] font-light text-[#3c3c3c] flex-wrap mb-[16px]">
          <span className="flex items-center gap-1">👥 {maxGuests}</span>
          <span className="flex items-center gap-1">🛏️ {bedrooms}</span>
          <span className="flex items-center gap-1">🚿 {bathrooms}</span>
        </div>

        {/* Price + Rating */}
        <div className="flex items-end justify-between pt-[16px] border-t border-[#e6e6e6] flex-row mt-auto">
          <div>
            <p className="text-[24px] font-bold text-[#262626] leading-[1.1]">
              {currencySymbol}{price}
            </p>
            <p className="text-[12px] font-light text-[#6b6b6b] mt-1 uppercase tracking-[0.5px]">
              / NOITE
            </p>
          </div>
          {rating !== undefined && rating > 0 && (
            <div className="text-right">
              <p className="font-bold text-[14px] text-[#262626]">⭐ {rating.toFixed(1)}</p>
              <p className="text-[12px] font-light text-[#6b6b6b]">
                {reviewCount || 0} avaliações
              </p>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div className="mt-[24px]">
          <Link
            href={href}
            className="w-full bg-[#1c69d4] hover:bg-[#0653b6] text-[#ffffff] text-[13px] rounded-none font-bold uppercase tracking-[1.5px] transition-colors h-[48px] flex items-center justify-center"
          >
            RESERVAR AGORA ›
          </Link>
        </div>
      </div>
    </div>
  )
}
