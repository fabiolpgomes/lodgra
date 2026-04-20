'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'

interface PropertyHeroGalleryProps {
  photos: string[]
  propertyName: string
  onViewAll: () => void
  onPhotoClick: (index: number) => void
}

export function PropertyHeroGallery({
  photos,
  propertyName,
  onViewAll,
  onPhotoClick,
}: PropertyHeroGalleryProps) {
  const [carouselIndex, setCarouselIndex] = useState(0)

  const heroImage = photos[0]
  const thumbs = photos.slice(1, 5)
  const remainingCount = Math.max(0, photos.length - 5)

  // Mobile carousel
  const nextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % photos.length)
  }

  const prevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  // Empty state when no photos
  if (photos.length === 0) {
    return (
      <div className="w-full h-80 md:h-96 rounded-xl bg-neutral-100 flex flex-col items-center justify-center gap-3 text-neutral-400">
        <span className="text-6xl">🏠</span>
        <p className="text-sm font-medium">Fotos em breve</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop: Grid Layout (1 large + 4 thumbs) */}
      <div className="hidden md:grid grid-cols-5 grid-rows-2 gap-2 rounded-xl overflow-hidden h-96">
        {/* Hero Image (2x2) */}
        <div
          className="col-span-3 row-span-2 relative group cursor-pointer rounded-lg overflow-hidden bg-neutral-100"
          onClick={() => onPhotoClick(0)}
        >
          {heroImage && (
            <Image
              src={heroImage}
              alt={propertyName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </div>

        {/* Thumbnails (4 images) */}
        {thumbs.map((photo, idx) => (
          <div
            key={idx}
            className="relative group cursor-pointer rounded-lg overflow-hidden bg-neutral-100"
            onClick={() => onPhotoClick(idx + 1)}
          >
            <Image
              src={photo}
              alt={`${propertyName} - ${idx + 2}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 25vw, 16vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            {idx === 3 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewAll()
                  }}
                  className="text-white font-semibold text-sm hover:text-white transition-colors"
                >
                  +{remainingCount} fotos
                </button>
              </div>
            )}
          </div>
        ))}

        {/* View All Button (only show if not already in grid) */}
        {photos.length > 5 && (
          <button
            onClick={onViewAll}
            className="absolute bottom-4 right-4 bg-white rounded-lg px-4 py-2 font-semibold text-sm shadow-md hover:shadow-lg transition-shadow flex items-center gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            Ver todas as fotos
          </button>
        )}
      </div>

      {/* Mobile: Carousel */}
      <div className="md:hidden relative h-80 rounded-xl overflow-hidden bg-neutral-100">
        {photos.length > 0 && (
          <Image
            src={photos[carouselIndex]}
            alt={`${propertyName} - ${carouselIndex + 1}`}
            fill
            className="object-cover"
            priority={carouselIndex === 0}
            sizes="calc(100vw - 2rem)"
          />
        )}

        {/* Carousel Controls */}
        <div className="absolute inset-0 flex items-center justify-between p-4">
          <button
            onClick={prevSlide}
            className="bg-white/80 hover:bg-white rounded-full p-2 transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-6 h-6 text-neutral-900" />
          </button>
          <button
            onClick={nextSlide}
            className="bg-white/80 hover:bg-white rounded-full p-2 transition-all"
            aria-label="Próximo"
          >
            <ChevronRight className="w-6 h-6 text-neutral-900" />
          </button>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {photos.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCarouselIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === carouselIndex ? 'bg-white w-6' : 'bg-white/50'
              }`}
              aria-label={`Ir para foto ${idx + 1}`}
            />
          ))}
        </div>

        {/* View All Button */}
        <button
          onClick={onViewAll}
          className="absolute top-4 right-4 bg-white rounded-lg px-3 py-2 font-semibold text-sm shadow-md hover:shadow-lg transition-shadow flex items-center gap-2"
        >
          <Maximize2 className="w-4 h-4" />
          Ver todas
        </button>
      </div>

      {/* Counter */}
      <p className="mt-3 text-sm text-neutral-600">
        {carouselIndex + 1} de {photos.length}
      </p>
    </>
  )
}
