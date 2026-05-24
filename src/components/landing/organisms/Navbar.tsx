'use client'

import React from 'react'
import Link from 'next/link'
import { Container } from '../atoms/Container'
import { Logo } from '../atoms/Logo'
import { Button } from '../atoms/Button'
import { ThemeToggle } from '@/components/common/header/ThemeToggle'

export const Navbar: React.FC = () => {
  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <Container>
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Logo size="md" variant="dark" />
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

          {/* Right: Theme Toggle + CTA */}
          <div className="flex items-center gap-4">
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
