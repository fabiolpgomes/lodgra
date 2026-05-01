'use client'

import { useState, useEffect } from 'react'
import { Share2, Check } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/common/ui/Logo'

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
  const [copied, setCopied] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleShare = async () => {
    const url = window.location.href
    const shareData = {
      title: propertyName,
      text: `${propertyName} em ${city}, ${country}`,
      url,
    }

    // Try native share (mobile)
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // User cancelled or error — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard with visual feedback
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // clipboard API not available — use legacy method
      const el = document.createElement('textarea')
      el.value = url
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-white border-b border-neutral-200 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo size="md" variant={scrolled ? 'default' : 'white'} />
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Badge */}
          <div className={`hidden md:inline-block px-3 py-1 rounded-full text-sm font-medium ${
            scrolled ? 'bg-green-50 text-green-700' : 'bg-white/20 text-white backdrop-blur-sm'
          }`}>
            ✓ Reserva Directa
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              scrolled
                ? 'text-neutral-700 hover:bg-neutral-100'
                : 'text-white hover:bg-white/20'
            }`}
            aria-label="Partilhar"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="hidden sm:inline text-green-500">Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Partilhar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
