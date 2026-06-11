'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Users, BedDouble, Bath, ArrowRight } from 'lucide-react'
import { getCurrencySymbol } from '@/lib/currency/symbols'
import type { StructuredAmenity } from '../content/PropertyAmenitiesV2'

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
  structuredAmenities?: StructuredAmenity[]
  rating?: number
  reviewCount?: number
  isFeatured?: boolean
  checkIn?: string
  checkOut?: string
}

const AMENITY_LABELS: Record<string, string> = {
  piscina: 'Piscina', wifi: 'Wi-Fi', 'wi-fi': 'Wi-Fi',
  estacionamento: 'Estacionamento', garagem: 'Estacionamento',
  varanda: 'Varanda', jardim: 'Jardim',
  'ar condicionado': 'Ar condicionado', cozinha: 'Cozinha',
  praia: 'Perto da praia', churrasqueira: 'Churrasqueira',
}
function formatAmenity(a: string) { return AMENITY_LABELS[a.toLowerCase()] ?? a }

function ratingLabel(r: number): { text: string; color: string } | null {
  if (r >= 9.5) return { text: 'Excepcional', color: 'text-emerald-600' }
  if (r >= 9)   return { text: 'Excelente',   color: 'text-emerald-600' }
  if (r >= 8)   return { text: 'Muito Bom',   color: 'text-brand-600' }
  if (r >= 7)   return { text: 'Bom',         color: 'text-brand-500' }
  if (r >= 6)   return { text: 'Satisfatório', color: 'text-gray-600' }
  return null
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
  const rl = rating !== undefined && rating > 0 ? ratingLabel(rating) : null

  return (
    // Entire card is clickable via absolute overlay; inner CTA has z-10
    <div
      className="relative group bg-white rounded-lg border border-gray-200
        hover:shadow-xl hover:border-brand-200 hover:-translate-y-0.5
        active:scale-[0.99] active:shadow-md
        transition-all duration-200 overflow-hidden flex flex-col md:flex-row"
      data-testid={`property-card-${id}`}
    >
      {/* Clickable overlay — covers the whole card */}
      <Link href={href} className="absolute inset-0 z-0" aria-label={`Ver detalhes: ${name}`} />

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
          <div className="absolute top-3 left-3 bg-gray-900 text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-[1.2px] z-10">
            Destaque
          </div>
        )}
        {rating !== undefined && rating > 0 && (
          <div className="md:hidden absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded text-[12px] font-bold flex items-center gap-1 z-10">
            ⭐ {rating.toFixed(1)}
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

        {/* Rating — desktop below amenities, mobile below specs (item 1) */}
        {rl && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 md:mt-3">
            <div className="flex items-baseline gap-0.5 leading-none">
              <span className="text-[26px] font-black text-brand-900">{rating!.toFixed(1)}</span>
              <span className="text-[13px] text-gray-400 ml-0.5">/10</span>
            </div>
            <div>
              <p className={`text-[13px] font-bold ${rl.color}`}>{rl.text}</p>
              {reviewCount ? <p className="text-[12px] text-gray-500">Baseado em {reviewCount} avaliações</p> : null}
            </div>
          </div>
        )}

        {/* Footer: rating (mobile) + price (mobile) + CTA */}
        <div className="mt-auto pt-4 flex items-end justify-between gap-3">
          <div className="md:hidden">
            <p className="text-[11px] text-gray-500">desde</p>
            <p className="text-[20px] font-bold text-gray-900 leading-tight">{currencySymbol}{price}</p>
            <p className="text-[11px] text-gray-500">/ noite</p>
          </div>

          {/* CTA — relative z-10 so it's above the overlay (items 4+5) */}
          <Link
            href={href}
            className="relative z-10 shrink-0 flex items-center gap-2 bg-brand-800 hover:bg-brand-900 active:scale-95 text-white text-[13px] font-bold uppercase tracking-[1.2px] transition-all px-6 min-h-[44px] rounded"
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
