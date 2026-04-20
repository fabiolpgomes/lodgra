'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface PropertyLightboxProps {
  photos: string[]
  initialIndex?: number
  onClose: () => void
}

export function PropertyLightbox({
  photos,
  initialIndex = 0,
  onClose,
}: PropertyLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }, [photos.length])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }, [photos.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prevSlide()
      if (e.key === 'ArrowRight') nextSlide()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, nextSlide, prevSlide])

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      {/* Main Image */}
      <div className="relative w-full h-full max-w-5xl max-h-screen flex items-center justify-center">
        <Image
          src={photos[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          fill
          className="object-contain"
          priority
        />

        {/* Previous Button */}
        {photos.length > 1 && (
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 transition-all z-10"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>
        )}

        {/* Next Button */}
        {photos.length > 1 && (
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 transition-all z-10"
            aria-label="Próximo"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-3 transition-all z-10"
          aria-label="Fechar"
        >
          <X className="w-8 h-8 text-white" />
        </button>

        {/* Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 rounded-full px-4 py-2 text-white text-sm font-medium">
          {currentIndex + 1} / {photos.length}
        </div>

        {/* Thumbnails */}
        {photos.length > 1 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-xl px-4">
            {photos.map((photo, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                  idx === currentIndex ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-80'
                }`}
              >
                <Image
                  src={photo}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
