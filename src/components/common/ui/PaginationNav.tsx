'use client'

import Link from 'next/link'

interface PaginationNavProps {
  page: number
  total: number
  pageSize: number
  /** base path + existing params to preserve (e.g. "?status=confirmed") — page param is appended */
  basePath?: string
}

export function PaginationNav({ page, total, pageSize, basePath = '' }: PaginationNavProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const sep = basePath.includes('?') ? '&' : '?'

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t text-sm text-gray-600">
      <span>
        {from.toLocaleString('pt-BR')}–{to.toLocaleString('pt-BR')} de{' '}
        {total.toLocaleString('pt-BR')}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={`${basePath}${sep}page=${page - 1}`}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            ← Anterior
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={`${basePath}${sep}page=${page + 1}`}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            Próxima →
          </Link>
        )}
      </div>
    </div>
  )
}
