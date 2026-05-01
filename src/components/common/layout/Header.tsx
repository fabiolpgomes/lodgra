'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Settings, RefreshCw, Users, UserCog } from 'lucide-react'
import { Logo } from '@/components/common/ui/Logo'
import { UserMenu } from '@/components/auth/UserMenu'
import { LocaleSelector } from '@/components/common/header/LocaleSelector'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/lib/i18n/routing'
import type { UserProfile } from '@/lib/auth/getUserAccess'

const NAV_PATHS = [
  { path: '/', label: 'Dashboard' },
  { path: '/properties', label: 'Propriedades' },
  { path: '/reservations', label: 'Reservas' },
  { path: '/expenses', label: 'Despesas' },
  { path: '/financial', label: 'Financeiro' },
  { path: '/calendar', label: 'Calendário' },
  { path: '/reports', label: 'Relatórios' },
]

const CONFIG_PATHS = [
  { path: '/owners', label: 'Proprietários', icon: Users },
  { path: '/sync', label: 'Sincronização', icon: RefreshCw },
  { path: '/settings', label: 'Definições', icon: Settings },
]

interface HeaderProps {
  serverProfile?: UserProfile // Server-provided profile (SSR) - avoids race condition
}

export function Header({ serverProfile }: HeaderProps) {
  // Use server profile if available (no race condition), otherwise fallback to useAuth
  const { profile: clientProfile } = useAuth()
  const profile = serverProfile || clientProfile
  const locale = useLocale()

  const isAdmin = profile?.role === 'admin'
  const isGestor = profile?.role === 'gestor'

  // Build locale-prefixed links
  const prefix = locale ? `/${locale}` : ''
  const NAV_LINKS = NAV_PATHS.map(({ path, label }) => ({
    href: path === '/' ? (prefix || '/') : `${prefix}${path}`,
    label,
  }))
  const CONFIG_LINKS = CONFIG_PATHS.map(({ path, label, icon }) => ({
    href: `${prefix}${path}`,
    label,
    icon,
  }))

  // Filter nav links based on role
  const visibleNavLinks = NAV_LINKS.filter(link => {
    if (isGestor) {
      // Gestor cannot see dashboard, financial pages, or reports
      const blocked = ['/', '/reports', '/financial']
      const normalizedHref = link.href.replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/|$)/, '') || '/'
      if (blocked.includes(normalizedHref)) return false
    }
    return true
  })

  const [configOpen, setConfigOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setConfigOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="sticky top-0 z-50 glass border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href={prefix || '/'} className="flex items-center">
            <Logo size="lg" />
          </Link>

          {/* Desktop nav only */}
          <nav className="hidden md:flex items-center gap-6">
            {visibleNavLinks.map(link => (
              <Link key={link.href} href={link.href} className="text-gray-600 hover:text-gray-900 text-sm">
                {link.label}
              </Link>
            ))}

            {/* Dropdown Configuração */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setConfigOpen(v => !v)}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm"
              >
                Configuração
                <ChevronDown className={`h-4 w-4 transition-transform ${configOpen ? 'rotate-180' : ''}`} />
              </button>

              {configOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-50">
                  {CONFIG_LINKS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setConfigOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Icon className="h-4 w-4 text-gray-400" />
                      {label}
                    </Link>
                  ))}
                  {isAdmin && (
                    <>
                      <div className="my-1 border-t border-gray-100" />
                      <Link
                        href={`${prefix}/admin/users`}
                        onClick={() => setConfigOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <UserCog className="h-4 w-4 text-gray-400" />
                        Utilizadores
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Right side: Locale Selector + User Menu */}
          <div className="flex items-center gap-2 md:gap-4">
            <LocaleSelector />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
