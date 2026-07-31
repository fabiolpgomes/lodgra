'use client'

import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Bell, Search } from 'lucide-react'
import { LocaleSelector } from '@/components/common/header/LocaleSelector'
import { ThemeToggle } from '@/components/common/header/ThemeToggle'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'

const SearchModal = dynamic(() => import('@/components/common/search/SearchModal').then(mod => mod.SearchModal), { ssr: false })

const PATH_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/properties': 'Propriedades',
  '/reservations': 'Reservas',
  '/expenses': 'Despesas',
  '/financial': 'Financeiro',
  '/calendar': 'Calendário',
  '/reports': 'Relatórios',
  '/owners': 'Proprietários',
  '/sync': 'Sincronização',
  '/settings': 'Definições',
  '/admin/users': 'Usuários',
}

function getPageTitle(pathname: string): string {
  // Strip locale prefix (e.g. /pt, /en, /es)
  const withoutLocale = pathname.replace(/^\/[a-z]{2}(\/|$)/, '/')
  const normalized = withoutLocale === '' ? '/' : withoutLocale

  // Exact match first
  if (PATH_LABELS[normalized]) return PATH_LABELS[normalized]

  // Prefix match (e.g. /properties/123 → Propriedades)
  for (const [key, label] of Object.entries(PATH_LABELS)) {
    if (key !== '/' && normalized.startsWith(key)) return label
  }

  return ''
}

export function TopBar() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)
  const { query, results, isLoading, isOpen, handleInputChange, handleOpen, handleClose } = useGlobalSearch()

  return (
    <>
      <header className="hidden md:flex items-center justify-between h-[64px] px-8 bg-brand-canvas border-b border-brand-border-soft sticky top-0 z-30">
        <h1 className="text-sm font-semibold text-brand-text-dark tracking-wide">{title}</h1>

        <div className="flex items-center gap-4">
          {/* Search Input - Padronizado */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-brand-text-medium" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onClick={handleOpen}
              className="text-sm px-3 py-1.5 bg-brand-surface rounded border border-brand-border placeholder-brand-text-medium text-brand-text-dark focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-transparent transition-all"
            />
          </div>

          {/* Theme Toggle - Dia/Noite */}
          <ThemeToggle />

          {/* Locale Selector */}
          <LocaleSelector />

          {/* Notifications */}
          <button
            className="p-2 text-brand-text-medium hover:text-brand-blue hover:bg-brand-blue/5 transition-all rounded"
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </header>

      <SearchModal
        isOpen={isOpen}
        query={query}
        results={results}
        isLoading={isLoading}
        onClose={handleClose}
        onQueryChange={handleInputChange}
      />
    </>
  )
}
