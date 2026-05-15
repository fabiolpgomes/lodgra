'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown } from 'lucide-react'

export interface TableColumn<T> {
  key: keyof T
  label: string
  sortable?: boolean
  width?: string
  render?: (value: any, row: T) => React.ReactNode
}

export interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  striped?: boolean
  bordered?: boolean
  hoverable?: boolean
  sortBy?: keyof T
  sortDirection?: 'asc' | 'desc'
  onSort?: (key: keyof T) => void
  loading?: boolean
  emptyState?: React.ReactNode
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  striped = true,
  bordered = true,
  hoverable = true,
  sortBy,
  sortDirection = 'asc',
  onSort,
  loading = false,
  emptyState = 'No data available',
}: TableProps<T>) {
  const getSortIcon = (key: keyof T) => {
    if (sortBy !== key) return null
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
  }

  const handleSort = (key: keyof T) => {
    if (onSort) onSort(key)
  }

  return (
    <div className="w-full overflow-x-auto rounded-sm border border-lodgra-primary/10">
      <table className="w-full">
        {/* Header */}
        <thead>
          <tr className={cn('bg-lodgra-bg-light border-b border-lodgra-primary/10')}>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  'px-4 py-3 text-left text-design-sm font-heading font-black text-lodgra-primary uppercase tracking-wider',
                  column.width && `w-${column.width}`
                )}
              >
                {column.sortable ? (
                  <button
                    onClick={() => handleSort(column.key)}
                    className="flex items-center gap-2 hover:text-lodgra-accent transition-colors"
                  >
                    {column.label}
                    {getSortIcon(column.key)}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-lodgra-primary border-t-transparent"></div>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-design-sm text-lodgra-primary/60"
              >
                {emptyState}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                className={cn(
                  'border-b border-lodgra-primary/10 transition-colors',
                  striped && idx % 2 === 0 && 'bg-lodgra-bg-light',
                  hoverable && 'hover:bg-lodgra-primary/5'
                )}
              >
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 text-design-sm text-lodgra-primary">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

Table.displayName = 'Table'
