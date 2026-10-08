'use client'

import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Search } from 'lucide-react'
import { LocaleSelector } from '@/components/common/header/LocaleSelector'
import { ThemeToggle } from '@/components/common/header/ThemeToggle'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { getModuleSummary, getPageTitle } from '@/lib/navigation/module-shell'
import { SyncBell } from '@/components/common/layout/SyncBell'

const LOCALE_SEGMENT = /^[a-z]{2}(-[A-Z]{2})?$/

const SearchModal = dynamic(() => import('@/components/common/search/SearchModal').then(mod => mod.SearchModal), { ssr: false })

export function TopBar() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)
  const firstSegment = (pathname ?? '').split('/')[1] ?? ''
  const locale = LOCALE_SEGMENT.test(firstSegment) ? firstSegment : 'pt-BR'
  const moduleSummary = getModuleSummary(pathname)
  const { query, results, isLoading, isOpen, handleInputChange, handleOpen, handleClose } = useGlobalSearch()

  return (
    <>
      <header className="hidden md:flex items-center justify-between gap-6 h-[64px] px-8 bg-brand-canvas border-b border-brand-border-soft sticky top-0 z-30">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">
            {moduleSummary.scopeLabel}
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[1px] text-brand-blue">
              {moduleSummary.label}
            </span>
            <h1 className="truncate text-sm font-semibold text-brand-text-dark tracking-wide">{title}</h1>
          </div>
        </div>

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

          {/* Notifications: pending sync actions */}
          <SyncBell locale={locale} />
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
