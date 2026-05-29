'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Container } from '../atoms/Container'
import { Logo } from '../atoms/Logo'
import { Button } from '@/design-system/atoms/Button'
import { ThemeToggle } from '@/components/common/header/ThemeToggle'

export const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <Container>
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Logo size="md" />
          </div>

          {/* Center Navigation (desktop only) */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-inter text-gray-600 dark:text-gray-300 hover:text-lodgra-blue dark:hover:text-lodgra-gold transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right: Theme Toggle + CTA + Hamburger */}
          <div className="flex items-center gap-4">
            <ThemeToggle />

            <Link
              href="/login"
              className="px-4 py-2 text-sm font-inter font-medium text-lodgra-blue dark:text-lodgra-gold border border-lodgra-blue/30 dark:border-lodgra-gold/30 rounded-lg hover:bg-lodgra-blue hover:text-white dark:hover:bg-lodgra-gold dark:hover:text-gray-900 transition-colors"
            >
              Entrar
            </Link>

            <Button
              size="sm"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="hidden sm:inline-block"
            >
              Ver Planos
            </Button>

            {/* Hamburger (mobile/tablet only) */}
            <button
              className="lg:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
              onClick={() => setMenuOpen(prev => !prev)}
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
            >
              <span className={`block h-0.5 w-6 bg-gray-700 dark:bg-gray-200 transition-transform duration-200 ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
              <span className={`block h-0.5 w-6 bg-gray-700 dark:bg-gray-200 transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-6 bg-gray-700 dark:bg-gray-200 transition-transform duration-200 ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="lg:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <Container>
            <div className="flex flex-col py-4 gap-4">
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-inter text-gray-600 dark:text-gray-300 hover:text-lodgra-blue dark:hover:text-lodgra-gold transition-colors py-1"
                >
                  {link.label}
                </a>
              ))}
              <Button
                size="sm"
                onClick={() => {
                  setMenuOpen(false)
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="w-full sm:hidden"
              >
                Ver Planos
              </Button>
            </div>
          </Container>
        </div>
      )}
    </nav>
  )
}
