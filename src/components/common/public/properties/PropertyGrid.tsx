'use client'

import { useEffect } from 'react'
import { PropertyCard, PropertyCardProps } from './PropertyCard'

export interface PropertyGridProps {
  properties: PropertyCardProps[]
  isLoading: boolean
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function PropertyCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white h-full animate-pulse flex flex-col overflow-hidden">
      <div className="w-full aspect-[4/3] bg-gray-100" />
      <div className="p-5 space-y-3 flex-1">
        <div className="h-5 bg-gray-100 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
      <div className="px-5 pb-5 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="h-6 bg-gray-100 rounded w-1/3" />
        <div className="h-10 bg-gray-100 rounded w-1/4" />
      </div>
    </div>
  )
}

function PaginationButton({ page, isActive, isDisabled, onClick }: {
  page: number | string
  isActive: boolean
  isDisabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      aria-label={typeof page === 'number' ? `Página ${page}` : String(page)}
      aria-current={isActive ? 'page' : undefined}
      className={`h-11 min-w-[44px] px-3 rounded font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-800 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed border
        ${isActive
          ? 'bg-brand-800 text-white border-brand-800'
          : 'bg-white text-gray-900 border-gray-200 hover:border-brand-800 hover:text-brand-800'
        }`}
    >
      {page}
    </button>
  )
}

// Mobile: 1 col cards | Tablet: 2 col cards | Desktop: 1 col horizontal list
const gridClass = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4 sm:gap-5 md:gap-4'

export function PropertyGrid({ properties, isLoading, currentPage, totalPages, onPageChange }: PropertyGridProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  const handlePageChange = (page: number) => {
    if (page !== currentPage && page > 0 && page <= totalPages) onPageChange(page)
  }

  const canPrevious = currentPage > 1
  const canNext = currentPage < totalPages

  if (isLoading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: 12 }).map((_, i) => <PropertyCardSkeleton key={`skeleton-${i}`} />)}
      </div>
    )
  }

  if (!properties.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-gray-200 rounded-lg">
        <div className="text-5xl mb-5">🔍</div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">Nenhuma propriedade encontrada</h3>
        <p className="text-base text-gray-600 font-light max-w-sm">
          Tente ajustar os filtros ou pesquisar por outra data
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1">
      <div className={gridClass}>
        {properties.map(property => <PropertyCard key={property.id} {...property} />)}
      </div>

      {totalPages > 1 && (
        <nav className="mt-10 flex flex-col items-center gap-4" aria-label="Paginação">
          <div className="flex gap-1.5 flex-wrap justify-center">
            <PaginationButton page="←" isActive={false} isDisabled={!canPrevious} onClick={() => handlePageChange(currentPage - 1)} />
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1
              return <PaginationButton key={p} page={p} isActive={p === currentPage} isDisabled={false} onClick={() => handlePageChange(p)} />
            })}
            <PaginationButton page="→" isActive={false} isDisabled={!canNext} onClick={() => handlePageChange(currentPage + 1)} />
          </div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
            Página {currentPage} de {totalPages}
          </p>
        </nav>
      )}
    </div>
  )
}
