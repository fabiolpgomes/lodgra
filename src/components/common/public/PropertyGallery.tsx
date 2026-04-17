'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'

interface PropertyGalleryProps {
  photos: string[]
  name: string
}

export function PropertyGallery({ photos, name }: PropertyGalleryProps) {
  const [current, setCurrent] = useState(0)

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-64 sm:h-80 lg:h-96 rounded-xl bg-gray-100 flex flex-col items-center justify-center text-gray-400">
        <ImageOff className="h-10 w-10 mb-2" />
        <span className="text-sm">Fotos em breve</span>
      </div>
    )
  }

  const prev = () => setCurrent((c) => (c - 1 + photos.length) % photos.length)
  const next = () => setCurrent((c) => (c + 1) % photos.length)

  return (
    <div className="relative w-full h-64 sm:h-80 lg:h-96 rounded-xl overflow-hidden bg-gray-100">
      <Image
        src={photos[current]}
        alt={`${name} — foto ${current + 1}`}
        fill
        className="object-cover"
        priority={current === 0}
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 960px"
      />

      {photos.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow hover:bg-white transition-colors"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow hover:bg-white transition-colors"
            aria-label="Próxima foto"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
                aria-label={`Ir para foto ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Counter */}
      {photos.length > 1 && (
        <span className="absolute top-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
          {current + 1}/{photos.length}
        </span>
      )}
    </div>
  )
}
