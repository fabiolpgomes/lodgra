'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Users, BedDouble, Bath } from 'lucide-react'
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
  bedrooms: number
  bathrooms: number
  maxGuests: number
  rating?: number
  reviewCount?: number
  isFeatured?: boolean
  checkIn?: string
  checkOut?: string
}

export function PropertyCard({
  id, slug, name, city, country, image, price, currency,
  bedrooms, bathrooms, maxGuests, rating, reviewCount,
  isFeatured, checkIn, checkOut,
}: PropertyCardProps) {
  const currencySymbol = getCurrencySymbol(currency)
  const href = checkIn && checkOut
    ? `/p/${slug}?checkIn=${checkIn}&checkOut=${checkOut}`
    : `/p/${slug}`

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 flex flex-col h-full hover:shadow-md hover:border-gray-400 transition-all duration-200 group overflow-hidden"
      data-testid={`property-card-${id}`}
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
        {image ? (
          <Image
            src={image} alt={name}
            fill loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-gray-300">🏠</div>
        )}
        {isFeatured && (
          <div className="absolute top-3 left-3 bg-gray-900 text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-[1.2px]">
            Destaque
          </div>
        )}
        {rating !== undefined && rating > 0 && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded text-[12px] font-bold flex items-center gap-1">
            ⭐ {rating.toFixed(1)}
            {reviewCount ? <span className="font-normal text-gray-600">({reviewCount})</span> : null}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <div className="mb-3">
          <h2 className="font-bold text-[16px] sm:text-[17px] text-gray-900 line-clamp-2 leading-[1.35] mb-1">
            {name}
          </h2>
          <p className="text-[13px] text-gray-600 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            {city}, {country}
          </p>
        </div>

        {/* Specs */}
        <div className="flex items-center gap-4 text-[13px] text-gray-600 mb-4">
          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-gray-400" />{maxGuests}</span>
          <span className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5 text-gray-400" />{bedrooms}</span>
          <span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5 text-gray-400" />{bathrooms}</span>
        </div>

        {/* Price + CTA */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <div>
            <p className="text-[22px] sm:text-[24px] font-bold text-gray-900 leading-none">
              {currencySymbol}{price}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-[0.5px]">/ noite</p>
          </div>
          <Link
            href={href}
            className="shrink-0 bg-brand-800 hover:bg-brand-900 active:scale-95 text-white text-[12px] font-bold uppercase tracking-[1.2px] transition-all px-4 min-h-[44px] flex items-center justify-center rounded"
          >
            Reservar
          </Link>
        </div>
      </div>
    </div>
  )
}
