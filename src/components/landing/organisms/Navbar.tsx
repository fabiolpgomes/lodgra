'use client'

import React from 'react'
import { Container } from '../atoms/Container'
import { Logo } from '../atoms/Logo'
import { Button } from '../atoms/Button'

interface NavbarProps {
  locale: 'pt-BR' | 'en-US' | 'es'
  onLocaleChange: (locale: 'pt-BR' | 'en-US' | 'es') => void
}

const localeLabels: Record<string, string> = {
  'pt-BR': 'Português',
  'en-US': 'English',
  'es': 'Español',
}

export const Navbar: React.FC<NavbarProps> = ({ locale, onLocaleChange }) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <Container>
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Logo size="md" variant="dark" />
            <span className="text-xl font-poppins font-bold text-lodgra-primary hidden sm:inline">
              Lodgra
            </span>
          </div>

          {/* Center Navigation (desktop only) */}
          <div className="hidden lg:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-inter text-gray-600 hover:text-lodgra-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm font-inter text-gray-600 hover:text-lodgra-primary transition-colors"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-sm font-inter text-gray-600 hover:text-lodgra-primary transition-colors"
            >
              FAQ
            </a>
          </div>

          {/* Right: Language Selector + CTA */}
          <div className="flex items-center gap-4">
            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-inter text-gray-600 hover:text-lodgra-primary transition-colors"
                aria-label="Toggle language selector"
                aria-expanded={isDropdownOpen}
              >
                <span className="hidden sm:inline">{localeLabels[locale]}</span>
                <span className="sm:hidden">
                  {locale === 'pt-BR' ? '🇧🇷' : locale === 'es' ? '🇪🇸' : '🇺🇸'}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-max">
                  {(['pt-BR', 'en-US', 'es'] as const).map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        onLocaleChange(loc)
                        setIsDropdownOpen(false)
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm font-inter transition-colors ${
                        locale === loc
                          ? 'bg-lodgra-primary text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      aria-label={`Switch to ${localeLabels[loc]}`}
                      aria-current={locale === loc ? 'true' : undefined}
                    >
                      {localeLabels[loc]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CTA Button */}
            <Button
              size="sm"
              onClick={() => (window.location.href = '/signup?plan=free')}
              className="hidden sm:inline-block"
            >
              Get Started
            </Button>
          </div>
        </div>
      </Container>
    </nav>
  )
}
