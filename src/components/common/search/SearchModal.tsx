'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, Search, Loader2 } from 'lucide-react'
import type { SearchResult } from '@/hooks/useGlobalSearch'

interface SearchModalProps {
  isOpen: boolean
  query: string
  results: SearchResult[]
  isLoading: boolean
  onClose: () => void
  onQueryChange: (query: string) => void
}

export function SearchModal({
  isOpen,
  query,
  results,
  isLoading,
  onClose,
  onQueryChange,
}: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
        <div
          className="w-full max-w-2xl mx-4 bg-white rounded-xl shadow-xl overflow-hidden"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Buscar propriedades, reservas, despesas e proprietários"
        >
          {/* Search Input */}
          <div className="px-6 py-4 border-b border-lodgra-blue/10 bg-white">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-lodgra-blue/40 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => onQueryChange(e.target.value)}
                placeholder="Pesquisar propriedades, reservas, despesas, proprietários..."
                className="flex-1 text-lg outline-none text-lodgra-blue placeholder:text-lodgra-blue/40"
                aria-label="Buscar propriedades, reservas, despesas, proprietários"
              />
              {isLoading && <Loader2 className="h-5 w-5 text-lodgra-blue/40 animate-spin" />}
              <button
                onClick={onClose}
                className="p-1 text-lodgra-blue/40 hover:text-lodgra-blue transition-colors"
                aria-label="Fechar busca"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {query.length < 2 ? (
              <div className="px-6 py-12 text-center text-lodgra-blue/50">
                <p className="text-sm">Digite pelo menos 2 caracteres para buscar</p>
              </div>
            ) : isLoading ? (
              <div className="px-6 py-12 text-center">
                <Loader2 className="h-6 w-6 text-lodgra-blue/40 animate-spin inline" />
              </div>
            ) : results.length === 0 ? (
              <div className="px-6 py-12 text-center text-lodgra-blue/50">
                <p className="text-sm">Nenhum resultado encontrado para &quot;{query}&quot;</p>
              </div>
            ) : (
              <div className="divide-y divide-lodgra-blue/5">
                {/* Group results by type */}
                {(() => {
                  const TYPE_ORDER = ['property', 'reservation', 'expense', 'owner'] as const
                  const uniqueTypes = Array.from(new Set(results.map(r => r.type)))
                    .sort((a, b) => {
                      const aIndex = TYPE_ORDER.indexOf(a)
                      const bIndex = TYPE_ORDER.indexOf(b)
                      return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex)
                    })
                  return uniqueTypes
                })().map(type => {
                  const typeResults = results.filter(r => r.type === type)
                  if (typeResults.length === 0) return null

                  const typeLabel = {
                    property: 'Propriedades',
                    reservation: 'Reservas',
                    expense: 'Despesas',
                    owner: 'Proprietários',
                  }[type as SearchResult['type']]

                  return (
                    <div key={type}>
                      <div className="px-6 py-2 bg-lodgra-blue/5">
                        <p className="text-xs font-bold text-lodgra-blue/60 uppercase tracking-[1px]">
                          {typeLabel}
                        </p>
                      </div>
                      {typeResults.map(result => (
                        <Link
                          key={`${result.type}-${result.id}`}
                          href={result.href}
                          onClick={onClose}
                          className="flex items-start gap-3 px-6 py-3 hover:bg-lodgra-accent/5 transition-colors group"
                        >
                          <span className="text-xl flex-shrink-0">{result.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-lodgra-blue group-hover:text-lodgra-accent transition-colors truncate">
                              {result.title}
                            </p>
                            {result.subtitle && (
                              <p className="text-xs text-lodgra-blue/60 truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-lodgra-blue/10 bg-lodgra-blue/5 text-xs text-lodgra-blue/60">
            <p>Dica: Pressione <kbd className="px-1.5 py-0.5 bg-white border border-lodgra-blue/10 rounded text-lodgra-blue font-mono text-[11px]">ESC</kbd> para fechar</p>
          </div>
        </div>
      </div>
    </>
  )
}
