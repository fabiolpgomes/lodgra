'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { Logo } from '@/components/landing/atoms/Logo'

interface PublicNavProps {
  variant?: 'light' | 'dark'
  compact?: boolean
}

export const PublicNav: React.FC<PublicNavProps> = ({ variant = 'light', compact = false }) => {
  const [isLangOpen, setIsLangOpen] = useState(false)

  const navLinks = [
    { href: '/features', label: 'Funcionalidades' },
    { href: '/pricing', label: 'Planos' },
    { href: '/docs', label: 'Documentação' },
  ]

  const languages = [
    { code: 'pt-BR', label: 'Brasil', flag: '🇧🇷' },
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ]
  const visibleLanguages = languages.filter((lang) => lang.code === 'pt-BR')

  const bgClass = variant === 'dark' ? 'bg-be-text' : 'bg-be-surface'
  const borderClass = variant === 'dark' ? 'border-white/10' : 'border-be-border'
  const textClass = variant === 'dark' ? 'text-white' : 'text-be-text'
  const hoverClass = variant === 'dark' ? 'hover:bg-white/10' : 'hover:bg-be-surface'

  return (
    <nav className={`fixed top-0 w-full z-50 ${bgClass} border-b ${borderClass}`}>
      <div className="max-w-[1440px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo + Nav Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <Logo size="md" />
          </Link>

          {!compact && (
            <div className={`hidden lg:flex items-center gap-2 text-[14px] font-medium tracking-normal ${textClass}`}>
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 transition-colors ${hoverClass}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right: Language + Login/CTA */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium tracking-normal ${textClass} ${hoverClass} transition-colors`}
            >
              🇧🇷 <span className="hidden sm:inline">Brasil</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLangOpen && (
              <div className={`absolute top-full right-0 mt-4 ${bgClass} border ${borderClass} min-w-[170px] rounded-md shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.1)] z-50 overflow-hidden`}>
                {visibleLanguages.map((lang) => (
                  <Link
                    key={lang.code}
                    href={`/${lang.code}`}
                    className={`flex items-center gap-3 px-4 py-3 text-[14px] transition-colors tracking-normal ${
                      lang.code === 'pt-BR'
                        ? 'bg-be-blue text-white font-medium'
                        : variant === 'dark'
                          ? 'text-white hover:bg-[#ffffff]/10'
                          : 'text-be-text hover:bg-be-surface-secondary'
                    }`}
                  >
                    <span className="text-base">{lang.flag}</span>
                    {lang.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/login"
            className={`rounded-full px-4 py-2 text-[14px] font-medium tracking-normal ${textClass} ${hoverClass} transition-colors`}
          >
            Entrar
          </Link>

          <Link
            href="/pricing"
            className="bg-be-blue text-white rounded-full font-medium text-[14px] tracking-normal px-8 h-[48px] flex items-center justify-center hover:bg-be-blue-hover transition-colors"
          >
            Ver Planos
          </Link>
        </div>
      </div>
    </nav>
  )
}
