/**
 * ReviewsCarousel Component
 * Display aggregated reviews from multiple sources (Booking, Airbnb, Google)
 */

'use client'

import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'

interface Review {
  reviewer_name: string
  rating: number
  comment: string
  review_date: string
  source: 'booking' | 'airbnb' | 'google'
}

interface ReviewsCarouselProps {
  reviews: Review[]
  averageRating: number
  totalReviews: number
}

const SOURCE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  booking: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Booking.com' },
  airbnb: { bg: 'bg-red-100', text: 'text-red-700', label: 'Airbnb' },
  google: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Google' },
}

export function ReviewsCarousel({ reviews, averageRating, totalReviews }: ReviewsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (reviews.length === 0) {
    return null
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1))
  }

  const currentReview = reviews[currentIndex]
  const sourceInfo = SOURCE_COLORS[currentReview.source]

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-PT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  return (
    <section className="my-12">
      {/* Rating Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Avaliações dos Hóspedes</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  className={i < Math.floor(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                />
              ))}
            </div>
            <span className="text-lg font-semibold text-gray-900">{averageRating.toFixed(1)}</span>
            <span className="text-sm text-gray-600">({totalReviews} avaliações)</span>
          </div>
        </div>
      </div>

      {/* Reviews Carousel */}
      <div className="relative">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {/* Review Content */}
          <div className="mb-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{currentReview.reviewer_name}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${sourceInfo.bg} ${sourceInfo.text}`}>
                {sourceInfo.label}
              </span>
            </div>

            {/* Rating Stars */}
            <div className="mb-2 flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={
                      i < Math.floor(currentReview.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">{currentReview.rating.toFixed(1)}/10</span>
            </div>

            {/* Review Text */}
            <p className="mb-3 text-gray-700">{currentReview.comment}</p>

            {/* Review Date */}
            <p className="text-xs text-gray-500">{formatDate(currentReview.review_date)}</p>
          </div>

          {/* Navigation */}
          {reviews.length > 1 && (
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={goToPrevious}
                className="rounded-full p-2 hover:bg-gray-100"
                aria-label="Avaliação anterior"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>

              <div className="flex gap-1">
                {reviews.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 w-2 rounded-full transition ${
                      index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    aria-label={`Ir para avaliação ${index + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={goToNext}
                className="rounded-full p-2 hover:bg-gray-100"
                aria-label="Próxima avaliação"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>
          )}

          {/* Pagination Info */}
          <div className="mt-3 text-center text-xs text-gray-500">
            {currentIndex + 1} de {reviews.length}
          </div>
        </div>
      </div>
    </section>
  )
}
