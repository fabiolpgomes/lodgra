'use client'

import React from 'react'
import Link from 'next/link'
import { Container } from '../atoms/Container'
import { Logo } from '../atoms/Logo'
import { Button } from '../atoms/Button'
import { ThemeToggle } from '@/components/common/header/ThemeToggle'

interface NavbarProps {
  locale: 'pt-BR' | 'en-US' | 'es' | 'pt'
  onLocaleChange: (locale: 'pt-BR' | 'en-US' | 'es' | 'pt') => void
}

const localeLabels: Record<string, string> = {
  'pt-BR': 'Brasil',
  'pt': 'Portugal',
  'en-US': 'English',
  'es': 'Español',
}

export const Navbar: React.FC<NavbarProps> = ({ locale, onLocaleChange }) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <Container>
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Logo size="md" variant="dark" />
            <span className="text-xl font-poppins font-bold text-lodgra-blue hidden sm:inline">
              Lodgra
            </span>
          </div>

          {/* Center Navigation (desktop only) */}
          <div className="hidden lg:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-inter text-gray-600 dark:text-gray-300 hover:text-lodgra-blue dark:hover:text-lodgra-gold transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm font-inter text-gray-600 dark:text-gray-300 hover:text-lodgra-blue dark:hover:text-lodgra-gold transition-colors"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-sm font-inter text-gray-600 dark:text-gray-300 hover:text-lodgra-blue dark:hover:text-lodgra-gold transition-colors"
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
                className="flex items-center gap-1 px-3 py-2 text-sm font-inter text-gray-600 dark:text-gray-300 hover:text-lodgra-blue transition-colors"
                aria-label="Toggle language selector"
                aria-expanded={isDropdownOpen}
              >
                <span className="hidden sm:inline">{localeLabels[locale]}</span>
                <span className="sm:hidden">
                  {locale === 'pt-BR' ? '🇧🇷' : locale === 'pt' ? '🇵🇹' : locale === 'es' ? '🇪🇸' : '🇺🇸'}
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
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden min-w-max">
                  {(['pt-BR', 'pt', 'en-US', 'es'] as const).map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        onLocaleChange(loc)
                        setIsDropdownOpen(false)
                      }}
                      className={`block w-full text-left px-4 py-3 text-sm font-inter transition-colors ${
                        locale === loc
                          ? 'bg-lodgra-blue text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      aria-label={`Switch to ${localeLabels[loc]}`}
                      aria-current={locale === loc ? 'true' : undefined}
                    >
                      <span className="mr-2">{loc === 'pt-BR' ? '🇧🇷' : loc === 'pt' ? '🇵🇹' : loc === 'es' ? '🇪🇸' : '🇺🇸'}</span>
                      {localeLabels[loc]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Login Button */}
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-inter font-medium text-lodgra-blue dark:text-lodgra-gold border border-lodgra-blue/30 dark:border-lodgra-gold/30 rounded-lg hover:bg-lodgra-blue hover:text-white dark:hover:bg-lodgra-gold dark:hover:text-gray-900 transition-colors"
            >
              Entrar
            </Link>

            {/* CTA Button */}
            <Button
              size="sm"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="hidden sm:inline-block"
            >
              Ver Planos
            </Button>
          </div>
        </div>
      </Container>
    </nav>
  )
}
