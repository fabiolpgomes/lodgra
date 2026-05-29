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
  id,
  slug,
  name,
  city,
  country,
  image,
  price,
  currency,
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

  const href = checkIn && checkOut
    ? `/p/${slug}?checkIn=${checkIn}&checkOut=${checkOut}`
    : `/p/${slug}`

  return (
    <div
      className="bg-[#ffffff] rounded-none border border-[#e6e6e6] flex flex-col h-full hover:border-[#262626] transition-colors group"
      data-testid={`property-card-${id}`}
    >
      {/* Image Container */}
      <div className="relative w-full aspect-[4/3] bg-[#fafafa] overflow-hidden flex items-center justify-center p-1">
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
          <div className="absolute top-4 left-4 bg-[#1a2129] text-[#ffffff] px-3 py-1.5 rounded-none text-[10px] font-bold uppercase tracking-[1.5px]">
            Destaque
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="p-6 flex flex-col flex-1">
        {/* Title + Location */}
        <div className="mb-4">
          <h3 className="font-bold text-[18px] text-[#262626] line-clamp-2 leading-[1.4] mb-1">
            {name}
          </h3>
          <p className="text-[14px] font-light text-[#6b6b6b] flex items-center gap-1">
            {city}, {country}
          </p>
        </div>

        {/* Specs */}
        <div className="flex gap-4 text-[14px] font-light text-[#3c3c3c] flex-wrap mb-4">
          <span className="flex items-center gap-1">👥 {maxGuests}</span>
          <span className="flex items-center gap-1">🛏️ {bedrooms}</span>
          <span className="flex items-center gap-1">🚿 {bathrooms}</span>
        </div>

        {/* Price + Rating */}
        <div className="flex items-end justify-between pt-4 border-t border-[#e6e6e6] flex-row mt-auto">
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
        <div className="mt-6">
          <Link
            href={href}
            className="w-full bg-lodgra-blue hover:bg-[#162d6e] text-[13px] rounded-none font-bold uppercase tracking-[1.5px] transition-colors h-[48px] flex items-center justify-center"
            style={{ color: '#ffffff' }}
          >
            RESERVAR AGORA ›
          </Link>
        </div>
      </div>
    </div>
  )
}
