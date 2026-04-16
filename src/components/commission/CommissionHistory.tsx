'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CommissionRow {
  id: string
  propertyId: string
  propertyName: string
  guestName: string
  checkIn: string
  checkOut: string
  grossRevenue: number
  commissionRate: number
  commissionAmount: number
  calculatedAt: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  pages: number
}

interface CommissionHistoryProps {
  pageSize?: number
}

export function CommissionHistory({ pageSize = 50 }: CommissionHistoryProps) {
  const [data, setData] = useState<CommissionRow[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: pageSize,
    total: 0,
    pages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'property' | 'amount'>('date')

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `/api/commissions/history?page=${pagination.page}&limit=${pageSize}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch commission history')
        }

        const result = await response.json()
        setData(result.data || [])
        setPagination(result.pagination || {})
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [pagination.page, pageSize])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const handlePreviousPage = () => {
    if (pagination.page > 1) {
      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
    }
  }

  const handleNextPage = () => {
    if (pagination.page < pagination.pages) {
      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
    }
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-600 text-sm font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Booking-Level Details
        </h3>
        <div className="flex gap-2 text-xs">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'property' | 'amount')}
            className="px-2 py-1 border border-gray-300 rounded text-gray-700"
          >
            <option value="date">Sort by: Date</option>
            <option value="property">Sort by: Property</option>
            <option value="amount">Sort by: Amount</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No bookings found</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Property</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Guest</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Check-in</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Check-out</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Rate</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row: CommissionRow) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-900 font-medium">{row.propertyName}</td>
                    <td className="py-3 px-4 text-gray-600">{row.guestName}</td>
                    <td className="py-3 px-4 text-gray-600">{formatDate(row.checkIn)}</td>
                    <td className="py-3 px-4 text-gray-600">{formatDate(row.checkOut)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      €{row.grossRevenue.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {(row.commissionRate * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 font-semibold">
                      €{row.commissionAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {data.map((row) => (
              <div
                key={row.id}
                className="border border-gray-200 rounded-lg p-3 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{row.propertyName}</p>
                    <p className="text-xs text-gray-500">{row.guestName}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    €{row.commissionAmount.toFixed(2)}
                  </p>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    Dates: {formatDate(row.checkIn)} → {formatDate(row.checkOut)}
                  </p>
                  <p>Revenue: €{row.grossRevenue.toFixed(2)}</p>
                  <p>Rate: {(row.commissionRate * 100).toFixed(0)}%</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600">
            Showing {data.length} of {pagination.total} bookings
            {pagination.limit !== pageSize && ` (Page ${pagination.page} of ${pagination.pages})`}
          </div>

          <div className="flex items-center gap-4">
            <select
              value={pageSize}
              onChange={(e) => {
                setPagination((prev) => ({
                  ...prev,
                  page: 1,
                  limit: parseInt(e.target.value),
                }))
              }}
              className="px-2 py-1 text-sm border border-gray-300 rounded text-gray-700"
            >
              <option value="25">25 items</option>
              <option value="50">50 items</option>
              <option value="100">100 items</option>
            </select>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={pagination.page === 1}
                className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages}
              </span>

              <button
                onClick={handleNextPage}
                disabled={pagination.page === pagination.pages}
                className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
