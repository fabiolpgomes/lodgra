'use client'

import { useState, useEffect } from 'react'
import { Share2, Home } from 'lucide-react'

interface PropertyPageHeaderProps {
  propertyName: string
  city: string
  country: string
}

export function PropertyPageHeader({
  propertyName,
  city,
  country,
}: PropertyPageHeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: propertyName,
        text: `Descubre ${propertyName} em ${city}, ${country}`,
        url: window.location.href,
      })
    } else {
      // Fallback: copy URL
      navigator.clipboard.writeText(window.location.href)
      alert('Link copiado!')
    }
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-200 ${
        scrolled
          ? 'bg-white shadow-sm border-b border-neutral-200'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <Home className="w-6 h-6 text-blue-600" />
          <span className={`font-bold text-lg transition-colors ${
            scrolled ? 'text-neutral-900' : 'text-white'
          }`}>
            Home Stay
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Badge */}
          <div className={`hidden md:inline-block px-3 py-1 rounded-full text-sm font-medium transition-all ${
            scrolled
              ? 'bg-green-50 text-green-700'
              : 'bg-white/20 text-white'
          }`}>
            ✓ Reserva Directa
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className={`p-2 rounded-lg transition-all ${
              scrolled
                ? 'hover:bg-neutral-100 text-neutral-700'
                : 'hover:bg-white/20 text-white'
            }`}
            aria-label="Partilhar"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
