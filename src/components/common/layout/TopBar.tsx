'use client'

import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Bell, Search } from 'lucide-react'
import { LocaleSelector } from '@/components/common/header/LocaleSelector'
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
      <header className="hidden md:flex items-center justify-between h-[64px] px-8 bg-white border-b border-be-blue/10 sticky top-0 z-30">
        <h1 className="text-[13px] font-black text-lodgra-blue uppercase tracking-[1.5px] font-[family-name:var(--font-hanken-grotesk)]">{title}</h1>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpen}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#f8f8f8] border border-be-blue/5 rounded hover:bg-[#f0f0f0] transition-colors"
          >
            <Search className="h-4 w-4 text-lodgra-blue/40" />
            <span className="text-[11px] font-bold text-lodgra-blue/30 uppercase tracking-[1px] font-[family-name:var(--font-hanken-grotesk)]">Pesquisar...</span>
          </button>

          <LocaleSelector />

          <button
            className="p-2 text-lodgra-blue/40 hover:text-be-blue hover:bg-be-blue/10 transition-all rounded"
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
