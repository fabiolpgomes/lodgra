'use client'

import { useState } from 'react'
import type { PropertyReview, ReviewSource } from '@/types/database'

const SOURCE_LABELS: Record<ReviewSource, string> = {
  booking: 'Booking.com',
  airbnb: 'Airbnb',
  google: 'Google',
  tripadvisor: 'TripAdvisor',
  direct: 'Reserva Direta',
  other: 'Outra',
}

const SOURCE_COLORS: Record<ReviewSource, string> = {
  booking: 'text-blue-700',
  airbnb: 'text-rose-600',
  google: 'text-amber-700',
  tripadvisor: 'text-green-700',
  direct: 'text-lodgra-brand-700',
  other: 'text-neutral-600',
}

// Escala máxima nativa de cada plataforma
const SOURCE_MAX: Record<ReviewSource, number> = {
  booking: 10, airbnb: 5, google: 5, tripadvisor: 5, direct: 10, other: 10,
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
}

interface ReviewCardProps {
  review: PropertyReview
}

function ReviewCard({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const hasLongText = review.review_text && review.review_text.length > 160
  const nativeMax = SOURCE_MAX[review.source] ?? 10
  const rating = Number(review.rating).toFixed(1)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 min-w-[280px] snap-start sm:min-w-0 shadow-sm">
      {/* Header: nota + fonte */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-0.5">
          <span className="text-base font-bold text-neutral-900">{rating}</span>
          <span className="text-xs text-neutral-400">/{nativeMax}</span>
        </div>
        <span className={`text-xs font-semibold truncate ${SOURCE_COLORS[review.source]}`}>
          {SOURCE_LABELS[review.source]}
        </span>
      </div>

      {/* Texto da review */}
      {review.review_text ? (
        <div>
          <p className={`text-sm text-neutral-700 leading-relaxed ${!expanded && hasLongText ? 'line-clamp-3' : ''}`}>
            {review.review_text}
          </p>
          {hasLongText && (
            <button
              type="button"
              onClick={() => setExpanded(prev => !prev)}
              className="mt-1 text-xs text-lodgra-brand-700 hover:underline font-medium"
            >
              {expanded ? 'Ver menos' : 'Ver mais'}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-400 italic">Sem comentário escrito.</p>
      )}

      {/* Footer: nome + data */}
      <div className="mt-auto pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-neutral-800 truncate">{review.reviewer_name}</span>
        <span className="text-xs text-neutral-400 shrink-0">{formatDate(review.review_date)}</span>
      </div>
    </div>
  )
}

interface PropertyReviewCardsProps {
  featuredReviews?: PropertyReview[]
}

export function PropertyReviewCards({ featuredReviews }: PropertyReviewCardsProps) {
  if (!featuredReviews || featuredReviews.length === 0) return null

  return (
    <section className="pt-4">
      {/* Mobile: carousel com scroll horizontal */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 sm:hidden -mx-4 px-4">
        {featuredReviews.map(review => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {/* Desktop: grid 2–3 colunas */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {featuredReviews.map(review => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </section>
  )
}
