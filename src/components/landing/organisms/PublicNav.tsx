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

  const bgClass = variant === 'dark' ? 'bg-[#1E3A8A]' : 'bg-white'
  const borderClass = variant === 'dark' ? 'border-[#ffffff]/10' : 'border-[#1E3A8A]/10'
  const textClass = variant === 'dark' ? 'text-white' : 'text-[#1E3A8A]'
  const hoverClass = variant === 'dark' ? 'hover:text-[#ffc000]' : 'hover:text-[#1E3A8A]'

  return (
    <nav className={`fixed top-0 w-full z-50 ${bgClass} border-b ${borderClass}`}>
      <div className="max-w-[1440px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo + Nav Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <Logo size="md" />
          </Link>

          {!compact && (
            <div className={`hidden lg:flex items-center gap-8 text-[13px] font-black tracking-[1px] uppercase ${textClass}`}>
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors ${hoverClass}`}
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
              className={`flex items-center gap-2 text-[13px] font-black tracking-[1px] uppercase ${textClass} ${hoverClass} transition-colors py-2`}
            >
              🇧🇷 <span className="hidden sm:inline">Brasil</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLangOpen && (
              <div className={`absolute top-full right-0 mt-4 ${bgClass} border ${borderClass} min-w-[170px] shadow-sm z-50`}>
                {languages.map((lang) => (
                  <Link
                    key={lang.code}
                    href={`/${lang.code}`}
                    className={`flex items-center gap-3 px-4 py-3 text-[13px] transition-colors uppercase tracking-[1px] ${
                      lang.code === 'pt-BR'
                        ? `bg-[#1E3A8A] ${variant === 'dark' ? 'text-white' : 'text-white'} font-black`
                        : variant === 'dark'
                          ? 'text-white hover:bg-[#ffffff]/10'
                          : 'text-[#262626] hover:bg-[#fafafa]'
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
            className={`text-[13px] font-black tracking-[1.5px] uppercase ${textClass} ${hoverClass} transition-colors`}
          >
            Entrar
          </Link>

          <Link
            href="/pricing"
            className={`bg-[#ffc000] text-[#1E3A8A] rounded-none uppercase font-black text-[14px] tracking-[1px] px-[32px] h-[48px] flex items-center justify-center hover:bg-[#e6ac00] transition-colors`}
          >
            Ver Planos
          </Link>
        </div>
      </div>
    </nav>
  )
}
