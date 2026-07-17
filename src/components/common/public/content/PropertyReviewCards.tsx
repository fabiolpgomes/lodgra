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
  booking: 'text-brand-700',
  airbnb: 'text-rose-600',
  google: 'text-amber-700',
  tripadvisor: 'text-green-700',
  direct: 'text-be-text-700',
  other: 'text-gray-600',
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
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 min-w-[280px] snap-start sm:min-w-0 shadow-sm">
      {/* Header: nota + fonte */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-0.5">
          <span className="text-base font-bold text-gray-900">{rating}</span>
          <span className="text-xs text-gray-400">/{nativeMax}</span>
        </div>
        <span className={`text-xs font-semibold truncate ${SOURCE_COLORS[review.source]}`}>
          {SOURCE_LABELS[review.source]}
        </span>
      </div>

      {/* Texto da review */}
      {review.review_text ? (
        <div>
          <p className={`text-sm text-gray-700 leading-relaxed ${!expanded && hasLongText ? 'line-clamp-3' : ''}`}>
            {review.review_text}
          </p>
          {hasLongText && (
            <button
              type="button"
              onClick={() => setExpanded(prev => !prev)}
              className="mt-1 text-xs text-be-text-700 hover:underline font-medium"
            >
              {expanded ? 'Ver menos' : 'Ver mais'}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">Sem comentário escrito.</p>
      )}

      {/* Footer: nome + data */}
      <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-800 truncate">{review.reviewer_name}</span>
        <span className="text-xs text-gray-400 shrink-0">{formatDate(review.review_date)}</span>
      </div>
    </div>
  )
}

const PAGE_SIZE = 6

interface PropertyReviewCardsProps {
  featuredReviews?: PropertyReview[]
}

export function PropertyReviewCards({ featuredReviews }: PropertyReviewCardsProps) {
  const [showAll, setShowAll] = useState(false)

  if (!featuredReviews || featuredReviews.length === 0) return null

  const visible = showAll ? featuredReviews : featuredReviews.slice(0, PAGE_SIZE)
  const hasMore = featuredReviews.length > PAGE_SIZE

  return (
    <section className="pt-4">
      {/* Mobile: carousel com scroll horizontal */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 sm:hidden -mx-4 px-4">
        {visible.map(review => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {/* Desktop: grid 2–3 colunas */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map(review => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {/* Botão expandir / colapsar */}
      {hasMore && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll(prev => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-neutral-50 transition-colors"
          >
            {showAll ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Ver menos
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Ver mais {featuredReviews.length - PAGE_SIZE} avaliações
              </>
            )}
          </button>
        </div>
      )}
    </section>
  )
}
