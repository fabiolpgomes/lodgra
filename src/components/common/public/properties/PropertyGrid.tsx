'use client'

import { useEffect } from 'react'
import { PropertyCard, PropertyCardProps } from './PropertyCard'

export interface PropertyGridProps {
  properties: PropertyCardProps[]
  isLoading: boolean
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  resultCount?: number
}

function PropertyCardSkeleton() {
  return (
    <div className="
      rounded-2xl
      overflow-hidden
      border border-hs-neutral-200
      bg-white
      space-y-3
      p-4
      h-full
      animate-pulse
    ">
      <div className="
        h-40
        md:h-48
        lg:h-52
        bg-hs-neutral-200
        rounded-lg
      " />
      <div className="space-y-2">
        <div className="h-4 bg-hs-neutral-200 rounded w-3/4" />
        <div className="h-3 bg-hs-neutral-200 rounded w-1/2" />
        <div className="h-3 bg-hs-neutral-200 rounded w-2/3" />
      </div>
      <div className="pt-2 space-y-2">
        <div className="h-4 bg-hs-neutral-200 rounded" />
        <div className="h-8 bg-hs-brand-100 rounded w-full" />
      </div>
    </div>
  )
}

function PaginationButton({
  page,
  isActive,
  isDisabled,
  onClick,
}: {
  page: number | string
  isActive: boolean
  isDisabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      aria-label={typeof page === 'number' ? `Página ${page}` : `${page}`}
      aria-current={isActive ? 'page' : undefined}
      className={`
        px-3
        py-2
        rounded-lg
        font-semibold
        text-sm
        transition-colors
        min-h-10
        min-w-10
        flex
        items-center
        justify-center
        focus:outline-none
        focus:ring-2
        focus:ring-offset-2
        focus:ring-hs-brand-400
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${
          isActive
            ? 'bg-hs-brand-400 text-white'
            : 'bg-hs-neutral-100 text-hs-neutral-700 hover:bg-hs-neutral-200'
        }
      `}
    >
      {page}
    </button>
  )
}

export function PropertyGrid({
  properties,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  resultCount,
}: PropertyGridProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  const handlePageChange = (page: number) => {
    if (page !== currentPage && page > 0 && page <= totalPages) {
      onPageChange(page)
    }
  }

  const prevPage = currentPage - 1
  const nextPage = currentPage + 1
  const canPrevious = currentPage > 1
  const canNext = currentPage < totalPages

  return (
    <div className="flex-1">
      {/* Results Count */}
      {resultCount !== undefined && (
        <div className="
          mb-6
          text-sm
          font-semibold
          text-hs-neutral-600
        ">
          {resultCount} propriedade{resultCount !== 1 ? 's' : ''} encontrada{resultCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="
          grid
          grid-cols-1
          md:grid-cols-2
          lg:grid-cols-4
          gap-4
          md:gap-5
          lg:gap-6
        ">
          {Array.from({ length: 12 }).map((_, i) => (
            <PropertyCardSkeleton key={`skeleton-${i}`} />
          ))}
        </div>
      ) : properties.length > 0 ? (
        <>
          <div className="
            grid
            grid-cols-1
            md:grid-cols-2
            lg:grid-cols-4
            gap-4
            md:gap-5
            lg:gap-6
          ">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                {...property}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="
                mt-12
                flex
                flex-col
                items-center
                gap-4
              "
              aria-label="Paginação"
            >
              <div className="flex gap-2 flex-wrap justify-center">
                {/* Previous Button */}
                <PaginationButton
                  page="←"
                  isActive={false}
                  isDisabled={!canPrevious}
                  onClick={() => handlePageChange(prevPage)}
                />

                {/* Page Numbers */}
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1
                  return (
                    <PaginationButton
                      key={pageNum}
                      page={pageNum}
                      isActive={pageNum === currentPage}
                      isDisabled={false}
                      onClick={() => handlePageChange(pageNum)}
                    />
                  )
                })}

                {/* Next Button */}
                <PaginationButton
                  page="→"
                  isActive={false}
                  isDisabled={!canNext}
                  onClick={() => handlePageChange(nextPage)}
                />
              </div>

              {/* Current Page Info */}
              <p className="
                text-xs
                text-hs-neutral-600
              ">
                Página {currentPage} de {totalPages}
              </p>
            </nav>
          )}
        </>
      ) : (
        <div className="
          flex
          flex-col
          items-center
          justify-center
          py-12
          text-center
        ">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="
            text-lg
            font-bold
            text-hs-neutral-900
            mb-2
          ">
            Nenhuma propriedade encontrada
          </h3>
          <p className="
            text-sm
            text-hs-neutral-600
            max-w-md
          ">
            Tente ajustar seus filtros ou pesquisar por outra localização
          </p>
        </div>
      )}
    </div>
  )
}
