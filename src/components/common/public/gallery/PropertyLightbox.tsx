'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface PropertyLightboxProps {
  images: string[]
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export function PropertyLightbox({
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: PropertyLightboxProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    },
    [onClose, onPrev, onNext]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [handleKey])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Galeria de fotos"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <span className="text-white/70 text-sm">
          {currentIndex + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Fechar galeria"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 relative flex items-center justify-center px-12 min-h-0">
        <button
          onClick={onPrev}
          className="absolute left-2 sm:left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Foto anterior"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="relative w-full h-full max-h-[70vh]">
          <Image
            src={images[currentIndex]}
            alt={`Foto ${currentIndex + 1}`}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        </div>

        <button
          onClick={onNext}
          className="absolute right-2 sm:right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Próxima foto"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="flex-shrink-0 px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 justify-center">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => {
                // navigate to index via onPrev/onNext chain or pass index up
                const diff = i - currentIndex
                if (diff > 0) for (let j = 0; j < diff; j++) onNext()
                else for (let j = 0; j < -diff; j++) onPrev()
              }}
              className={`relative h-12 w-16 flex-shrink-0 rounded overflow-hidden border-2 transition-colors ${
                i === currentIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-90'
              }`}
              aria-label={`Ver foto ${i + 1}`}
            >
              <Image src={src} alt={`Thumb ${i + 1}`} fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
