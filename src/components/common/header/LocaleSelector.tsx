'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from '@/lib/i18n/routing'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

interface LocaleOption {
  code: string
  name: string
  flag: string
  label: string
}

const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷', label: 'Brasil' },
  { code: 'en-US', name: 'English', flag: '🇺🇸', label: 'USA' },
  { code: 'es', name: 'Español', flag: '🇪🇸', label: 'Español' },
]

const VISIBLE_LOCALE_CODES = new Set(['pt-BR'])
const VISIBLE_LOCALE_OPTIONS = LOCALE_OPTIONS.filter(option => VISIBLE_LOCALE_CODES.has(option.code))

export function LocaleSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const currentLocale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get current locale option
  const currentOption = VISIBLE_LOCALE_OPTIONS.find(opt => opt.code === currentLocale) || VISIBLE_LOCALE_OPTIONS[0]

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Handle locale change
  const handleLocaleChange = async (newLocale: string) => {
    if (newLocale === currentLocale) {
      setIsOpen(false)
      return
    }

    try {
      setIsLoading(true)

      // Remove current locale from path and add new one
      // pathname looks like: /pt/dashboard, /pt-BR/calendar, etc
      const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, '')
      const newPath = `/${newLocale}${pathWithoutLocale || ''}`

      // Save preference to database
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_locale: newLocale }),
      }).catch(() => {
        // Silently fail - preference save is non-blocking
      })

      // Get the selected option for toast message
      const selectedOption = LOCALE_OPTIONS.find(opt => opt.code === newLocale)

      // Redirect to new locale
      router.push(newPath)

      // Show success toast
      toast.success(`Idioma alterado para ${selectedOption?.name || newLocale}`)

      setIsOpen(false)
    } catch (error) {
      console.error('Failed to change locale:', error)
      toast.error('Erro ao alterar idioma')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        aria-label="Alterar idioma"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-xl leading-none flex-shrink-0">{currentOption.flag}</span>
        <span className="hidden sm:inline text-sm font-medium text-gray-700">{currentOption.label}</span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg py-2 z-50"
          role="listbox"
          aria-label="Opções de idioma"
        >
          {VISIBLE_LOCALE_OPTIONS.map(option => (
            <button
              key={option.code}
              onClick={() => handleLocaleChange(option.code)}
              disabled={isLoading || option.code === currentLocale}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-sm text-left
                transition-colors
                ${
                  option.code === currentLocale
                    ? 'bg-brand-50 text-brand-900 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              role="option"
              aria-selected={option.code === currentLocale}
            >
              <span className="text-xl leading-none flex-shrink-0">{option.flag}</span>
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{option.name}</span>
                <span className="text-xs text-gray-600 truncate">{option.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
