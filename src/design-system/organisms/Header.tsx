'use client'

import React from 'react'
import Image from 'next/image'
import { SearchBox } from '@/design-system/molecules/SearchBox'
import { Menu, X } from 'lucide-react'

export interface HeaderProps {
  logo?: {
    src: string
    alt: string
    href?: string
  }
  navigation?: Array<{
    label: string
    href: string
  }>
  onSearch?: (value: string) => void
  userMenu?: React.ReactNode
  mobileMenuOpen?: boolean
  onMobileMenuToggle?: () => void
}

export function Header({
  logo,
  navigation = [],
  onSearch,
  userMenu,
  mobileMenuOpen = false,
  onMobileMenuToggle,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-sidebar bg-white border-b border-lodgra-primary/10 shadow-sm">
      <div className="px-4 py-3 max-w-7xl mx-auto">
        {/* Desktop Layout */}
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          {logo && (
            <a href={logo.href || '/'} className="flex items-center gap-2 flex-shrink-0">
              <Image src={logo.src} alt={logo.alt} width={32} height={32} className="h-8 w-auto" />
            </a>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 flex-1">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-design-sm text-lodgra-primary hover:font-bold transition-all"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Search */}
          <div className="hidden lg:flex flex-1 max-w-sm">
            {onSearch && (
              <SearchBox
                inputProps={{
                  placeholder: 'Pesquisar...',
                  size: 'sm',
                }}
                onSearch={onSearch}
              />
            )}
          </div>

          {/* User Menu / Mobile Toggle */}
          <div className="flex items-center gap-3">
            {userMenu}
            <button
              className="md:hidden p-2 rounded-sm hover:bg-lodgra-primary/5"
              onClick={onMobileMenuToggle}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 space-y-2 border-t border-lodgra-primary/10 pt-4">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block px-3 py-2 text-design-sm text-lodgra-primary hover:bg-lodgra-primary/5 rounded-sm"
              >
                {item.label}
              </a>
            ))}
            {onSearch && (
              <div className="px-3 py-2">
                <SearchBox
                  inputProps={{
                    placeholder: 'Pesquisar...',
                  }}
                  onSearch={onSearch}
                />
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}

Header.displayName = 'Header'
