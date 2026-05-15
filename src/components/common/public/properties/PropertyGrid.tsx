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
    <div className="
      rounded-none
      border border-[#e6e6e6]
      bg-[#ffffff]
      p-[24px]
      h-full
      animate-pulse
      flex flex-col
    ">
      <div className="
        w-full
        aspect-[4/3]
        bg-[#fafafa]
        rounded-none
        mb-[24px]
      " />
      <div className="space-y-4 flex-1">
        <div className="h-[24px] bg-[#f7f7f7] rounded-none w-3/4" />
        <div className="h-[16px] bg-[#f7f7f7] rounded-none w-1/2" />
        <div className="h-[16px] bg-[#f7f7f7] rounded-none w-2/3" />
      </div>
      <div className="pt-[24px] space-y-4 mt-auto border-t border-[#e6e6e6]">
        <div className="h-[24px] bg-[#f7f7f7] rounded-none w-1/3" />
        <div className="h-[48px] bg-[#f7f7f7] rounded-none w-full" />
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
        px-[16px]
        py-[12px]
        rounded-none
        font-bold
        text-[14px]
        transition-colors
        min-h-[48px]
        min-w-[48px]
        flex
        items-center
        justify-center
        focus:outline-none
        disabled:opacity-50
        disabled:cursor-not-allowed
        border
        ${
          isActive
            ? 'bg-[#1c69d4] text-[#ffffff] border-[#1c69d4]'
            : 'bg-[#ffffff] text-[#262626] border-[#e6e6e6] hover:bg-[#fafafa] hover:border-[#262626]'
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
      {/* Grid */}
      {isLoading ? (
        <div className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-3
          gap-[24px]
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
            xl:grid-cols-3
            gap-[24px]
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
                mt-[48px]
                flex
                flex-col
                items-center
                gap-[24px]
              "
              aria-label="Paginação"
            >
              <div className="flex gap-[8px] flex-wrap justify-center">
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
                text-[12px]
                text-[#9a9a9a]
                font-bold
                uppercase
                tracking-[0.5px]
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
          py-[96px]
          text-center
          bg-[#ffffff]
          border
          border-[#e6e6e6]
          rounded-none
        ">
          <div className="text-[48px] mb-[24px]">🔍</div>
          <h3 className="
            text-[24px]
            font-bold
            text-[#262626]
            mb-[16px]
          ">
            Nenhuma propriedade encontrada
          </h3>
          <p className="
            text-[16px]
            text-[#6b6b6b]
            font-light
            max-w-[400px]
          ">
            Tente ajustar seus filtros ou pesquisar por outra localização
          </p>
        </div>
      )}
    </div>
  )
}
