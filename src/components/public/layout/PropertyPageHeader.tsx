'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Share2, CheckCircle } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

interface PropertyPageHeaderProps {
  propertyName: string
}

export function PropertyPageHeader({ propertyName }: PropertyPageHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: propertyName, url })
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-sm shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" aria-label="Lodgra — página inicial">
          <Logo variant={scrolled ? 'default' : 'white'} size="md" />
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
              scrolled
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-white/90 hover:text-white hover:bg-white/10'
            }`}
            aria-label="Partilhar"
          >
            {shared ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{shared ? 'Copiado!' : 'Partilhar'}</span>
          </button>

          <span
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              scrolled
                ? 'border-lodgra-brand-200 text-lodgra-brand-600 bg-lodgra-brand-50'
                : 'border-white/40 text-white bg-white/10'
            }`}
          >
            ✓ Reserva directa
          </span>
        </div>
      </div>
    </header>
  )
}
