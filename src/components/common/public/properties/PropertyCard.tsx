'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Users, BedDouble, Bath, ArrowRight } from 'lucide-react'
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
  amenities?: string[]
  rating?: number
  reviewCount?: number
  isFeatured?: boolean
  checkIn?: string
  checkOut?: string
}

const AMENITY_LABELS: Record<string, string> = {
  piscina: 'Piscina',
  wifi: 'Wi-Fi',
  'wi-fi': 'Wi-Fi',
  estacionamento: 'Estacionamento',
  garagem: 'Estacionamento',
  varanda: 'Varanda',
  jardim: 'Jardim',
  'ar condicionado': 'Ar condicionado',
  cozinha: 'Cozinha',
  praia: 'Perto da praia',
  churrasqueira: 'Churrasqueira',
}

function formatAmenity(a: string) {
  return AMENITY_LABELS[a.toLowerCase()] ?? a
}

export function PropertyCard({
  id, slug, name, city, country, image, price, currency,
  bedrooms, bathrooms, maxGuests, amenities = [],
  rating, reviewCount, isFeatured, checkIn, checkOut,
}: PropertyCardProps) {
  const currencySymbol = getCurrencySymbol(currency)
  const href = checkIn && checkOut
    ? `/p/${slug}?checkIn=${checkIn}&checkOut=${checkOut}`
    : `/p/${slug}`

  const topAmenities = amenities.slice(0, 5).map(formatAmenity)

  return (
    <div
      className="group bg-white rounded-lg border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-200 overflow-hidden flex flex-col md:flex-row"
      data-testid={`property-card-${id}`}
    >
      {/* ── Image ─────────────────────────────────────────────── */}
      <div className="relative aspect-[4/3] md:aspect-auto md:w-[280px] md:shrink-0 bg-gray-100 overflow-hidden">
        {image ? (
          <Image
            src={image} alt={name} fill loading="lazy"
            sizes="(max-width: 768px) 100vw, 280px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl text-gray-200">🏠</div>
        )}
        {isFeatured && (
          <div className="absolute top-3 left-3 bg-gray-900 text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-[1.2px]">
            Destaque
          </div>
        )}
        {/* Rating overlay — visible on mobile only */}
        {rating !== undefined && rating > 0 && (
          <div className="md:hidden absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded text-[12px] font-bold flex items-center gap-1">
            ⭐ {rating.toFixed(1)}
            {reviewCount ? <span className="font-normal text-gray-600">({reviewCount})</span> : null}
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4 sm:p-5 md:p-6">

        {/* Header: title + price */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-bold text-[16px] md:text-[18px] text-gray-900 line-clamp-2 leading-[1.35] flex-1">
            {name}
          </h2>
          {/* Price — desktop top-right */}
          <div className="hidden md:block text-right shrink-0">
            <p className="text-[11px] text-gray-500 uppercase tracking-[0.5px]">desde</p>
            <p className="text-[24px] font-bold text-gray-900 leading-none">{currencySymbol}{price}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">/ noite</p>
          </div>
        </div>

        {/* Location */}
        <p className="mt-1.5 text-[13px] text-gray-600 flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          {city}, {country}
        </p>

        {/* Specs */}
        <div className="mt-2.5 flex items-center gap-1.5 text-[13px] text-gray-600 flex-wrap">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-gray-400" />Dorme {maxGuests}</span>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5 text-gray-400" />{bedrooms} {bedrooms === 1 ? 'quarto' : 'quartos'}</span>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5 text-gray-400" />{bathrooms} {bathrooms === 1 ? 'casa de banho' : 'casas de banho'}</span>
        </div>

        {/* Amenities chips — desktop only */}
        {topAmenities.length > 0 && (
          <div className="hidden md:flex flex-wrap gap-1.5 mt-3">
            {topAmenities.map(a => (
              <span key={a} className="text-[12px] bg-gray-50 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Footer: rating + CTA */}
        <div className="mt-auto pt-4 flex items-end justify-between gap-3">

          {/* Rating badge */}
          <div className="flex items-center gap-2 min-w-0">
            {rating !== undefined && rating > 0 ? (
              <>
                <div className="hidden md:flex items-center gap-1.5 bg-brand-800 text-white text-[13px] font-bold px-2.5 py-1.5 rounded">
                  ⭐ {rating.toFixed(1)}
                </div>
                {reviewCount ? (
                  <span className="hidden md:block text-[12px] text-gray-500">{reviewCount} avaliações</span>
                ) : null}
              </>
            ) : (
              <span className="hidden md:block text-[12px] text-gray-400 italic">Sem avaliações ainda</span>
            )}
          </div>

          {/* Price — mobile (bottom) */}
          <div className="md:hidden">
            <p className="text-[11px] text-gray-500">desde</p>
            <p className="text-[20px] font-bold text-gray-900 leading-tight">{currencySymbol}{price}</p>
            <p className="text-[11px] text-gray-500">/ noite</p>
          </div>

          {/* CTA */}
          <Link
            href={href}
            className="shrink-0 flex items-center gap-2 bg-brand-800 hover:bg-brand-900 active:scale-95 text-white text-[12px] md:text-[13px] font-bold uppercase tracking-[1.2px] transition-all px-5 min-h-[44px] rounded"
          >
            <span className="hidden md:inline">Ver detalhes</span>
            <span className="md:hidden">Reservar</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  )
}
