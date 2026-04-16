'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Images } from 'lucide-react'
import { PropertyLightbox } from './PropertyLightbox'

interface PropertyHeroGalleryProps {
  photos: string[]
  name: string
}

export function PropertyHeroGallery({ photos, name }: PropertyHeroGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [carouselIndex, setCarouselIndex] = useState(0)

  const allPhotos = photos.length > 0 ? photos : []

  // Debug log - remove in production
  if (typeof window !== 'undefined' && allPhotos.length === 0) {
    console.warn('⚠️ PropertyHeroGallery: No photos provided for property:', name)
  }

  function openLightbox(index: number) {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  function closeLightbox() {
    setLightboxOpen(false)
  }

  function prevPhoto() {
    setLightboxIndex(i => (i === 0 ? allPhotos.length - 1 : i - 1))
  }

  function nextPhoto() {
    setLightboxIndex(i => (i === allPhotos.length - 1 ? 0 : i + 1))
  }

  if (allPhotos.length === 0) {
    return (
      <div className="w-full h-64 sm:h-80 lg:h-[500px] rounded-2xl bg-hs-neutral-100 flex flex-col items-center justify-center text-gray-400 gap-2">
        <Images className="h-10 w-10 opacity-40" />
        <span className="text-sm">Fotos em breve</span>
      </div>
    )
  }

  const mainPhoto = allPhotos[0]
  const sidePhotos = allPhotos.slice(1, 5)

  return (
    <>
      {/* Desktop: 1+4 grid */}
      <div className="hidden lg:grid grid-cols-2 gap-2 h-[500px] rounded-2xl overflow-hidden relative">
        {/* Main photo */}
        <button
          className="relative col-span-1 row-span-2 overflow-hidden group"
          onClick={() => openLightbox(0)}
          aria-label="Ver foto principal"
        >
          <Image
            src={mainPhoto}
            alt={name}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
          />
        </button>

        {/* 4 thumbnails */}
        <div className="grid grid-cols-2 gap-2 col-span-1">
          {[0, 1, 2, 3].map(i => {
            const photo = sidePhotos[i]
            if (!photo) {
              return <div key={i} className="bg-hs-neutral-100" />
            }
            return (
              <button
                key={i}
                className="relative overflow-hidden group"
                onClick={() => openLightbox(i + 1)}
                aria-label={`Ver foto ${i + 2}`}
              >
                <Image
                  src={photo}
                  alt={`${name} — foto ${i + 2}`}
                  fill
                  className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  sizes="25vw"
                />
              </button>
            )
          })}
        </div>

        {/* "Ver todas" button */}
        {allPhotos.length > 1 && (
          <button
            onClick={() => openLightbox(0)}
            className="absolute bottom-4 right-4 flex items-center gap-2 bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-shadow"
          >
            <Images className="h-4 w-4" />
            Ver todas as {allPhotos.length} fotos
          </button>
        )}
      </div>

      {/* Mobile: carousel */}
      <div className="lg:hidden relative h-72 sm:h-80 overflow-hidden rounded-2xl">
        <Image
          src={allPhotos[carouselIndex]}
          alt={`${name} — foto ${carouselIndex + 1}`}
          fill
          className="object-cover"
          sizes="100vw"
          priority={carouselIndex === 0}
        />

        {/* Swipe hint + counter */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {allPhotos.slice(0, 8).map((_, i) => (
            <button
              key={i}
              onClick={() => setCarouselIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === carouselIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
              }`}
              aria-label={`Ir para foto ${i + 1}`}
            />
          ))}
        </div>

        {/* Navigation arrows */}
        {allPhotos.length > 1 && (
          <>
            <button
              onClick={() => setCarouselIndex(i => (i === 0 ? allPhotos.length - 1 : i - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              onClick={() => setCarouselIndex(i => (i === allPhotos.length - 1 ? 0 : i + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
              aria-label="Próxima foto"
            >
              ›
            </button>
          </>
        )}

        {/* Open lightbox */}
        <button
          onClick={() => openLightbox(carouselIndex)}
          className="absolute bottom-3 right-3 bg-white/90 text-gray-900 text-xs font-medium px-2 py-1 rounded-full"
        >
          {carouselIndex + 1}/{allPhotos.length}
        </button>
      </div>

      {lightboxOpen && (
        <PropertyLightbox
          images={allPhotos}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}
    </>
  )
}
