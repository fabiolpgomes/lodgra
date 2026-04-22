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
    <span className={`text-lg ${className}`} title={type}>
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

  // Build URL with optional search params
  const href = checkIn && checkOut
    ? `/p/${slug}?checkIn=${checkIn}&checkOut=${checkOut}`
    : `/p/${slug}`

  return (
    <Link
      href={href}
      className="
        rounded-2xl
        overflow-hidden
        border border-hs-neutral-200
        shadow-sm
        hover:shadow-md
        active:shadow-lg
        transition-shadow duration-200
        flex flex-col
        h-full
        group
      "
      data-testid={`property-card-${id}`}
    >
      {/* Image Container - Mobile First */}
      <div className="
        relative
        h-40
        w-full
        bg-gray-200
        overflow-hidden
        md:h-48
        lg:h-52
        flex items-center justify-center
      ">
        {image ? (
          <Image
            src={image}
            alt={name}
            width={1440}
            height={960}
            loading="lazy"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 48vw, 25vw"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-400 text-4xl">🏠</div>
        )}
        {isFeatured && (
          <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2.5 py-1 rounded-full text-xs font-semibold">
            ⭐ Anfitriões Estrela
          </div>
        )}
      </div>

      {/* Content Container - Mobile First */}
      <div className="
        p-3
        space-y-2
        md:p-4
        md:space-y-3
        flex flex-col flex-1
      ">
        {/* Title + Location */}
        <div>
          <h3 className="
            font-bold
            text-base
            md:text-lg
            line-clamp-2
            text-hs-neutral-900
          ">
            {name}
          </h3>
          <p className="
            text-xs
            md:text-sm
            text-hs-neutral-500
            flex items-center gap-1 mt-1
          ">
            📍 {city}, {country}
          </p>
        </div>

        {/* Amenities Icons */}
        <div className="flex gap-1 flex-wrap">
          {displayAmenities.map((amenity) => (
            <AmenityIcon
              key={amenity}
              type={amenity}
              className="h-5 w-5 md:h-6 md:w-6"
            />
          ))}
        </div>

        {/* Specs */}
        <div className="
          flex
          gap-2
          text-xs
          md:text-sm
          md:gap-3
          text-hs-neutral-600
          flex-wrap
        ">
          <span className="flex items-center gap-1">
            👥 {maxGuests}
          </span>
          <span className="flex items-center gap-1">
            🛏️ {bedrooms}
          </span>
          <span className="flex items-center gap-1">
            🚿 {bathrooms}
          </span>
        </div>

        {/* Price + Rating */}
        <div className="
          flex
          items-end
          justify-between
          pt-2
          border-t border-hs-neutral-100
          flex-col
          gap-2
          md:flex-row
          md:items-center
          mt-auto
        ">
          <div>
            <p className="text-xl md:text-2xl font-bold text-hs-neutral-900">
              {price}
            </p>
            <p className="text-xs text-hs-neutral-500">
              {currencySymbol} / noite
            </p>
          </div>
          {rating !== undefined && rating > 0 && (
            <div className="text-right text-sm md:text-base">
              <p className="font-bold">⭐ {rating.toFixed(1)}</p>
              <p className="text-xs text-hs-neutral-500">
                {reviewCount || 0} avaliações
              </p>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div className="block mt-2 flex-shrink-0">
          <div
            className="
              w-full py-2.5 px-3
              bg-lodgra-blue group-hover:bg-blue-900
              text-white text-sm md:text-base
              rounded-lg font-semibold
              transition-colors duration-150
              min-h-10 md:min-h-12
              flex items-center justify-center
            "
          >
            Reservar Agora
          </div>
        </div>
      </div>
    </Link>
  )
}
