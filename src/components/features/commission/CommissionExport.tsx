'use client'

import { useState } from 'react'
import { Card } from '@/components/common/ui/card'
import { Download, Loader } from 'lucide-react'

interface CommissionExportProps {
  defaultStartDate?: string
  defaultEndDate?: string
}

export function CommissionExport({
  defaultStartDate,
  defaultEndDate,
}: CommissionExportProps) {
  const [startDate, setStartDate] = useState(defaultStartDate || '')
  const [endDate, setEndDate] = useState(defaultEndDate || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleExport = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(false)

      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/commissions/export?${params}`)

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'commissions.csv'
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="?([^"]+)"?/)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during export')
    } finally {
      setIsLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Export Commission Data</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              From Date (optional)
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={today}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Default: All time</p>
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              To Date (optional)
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={today}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Default: Today</p>
          </div>
        </div>

        {/* Quick Date Ranges */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setStartDate(monthAgo)
              setEndDate(today)
            }}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => {
              const start = new Date()
              start.setMonth(0)
              start.setDate(1)
              setStartDate(start.toISOString().split('T')[0])
              setEndDate(today)
            }}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Year to Date
          </button>
          <button
            onClick={() => {
              setStartDate('')
              setEndDate('')
            }}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Clear Dates
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">✓ Export downloaded successfully</p>
          </div>
        )}

        {/* Download Button */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleExport}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download CSV
              </>
            )}
          </button>

          <div className="flex-1 flex items-center text-xs text-gray-500">
            <span>
              {startDate && endDate
                ? `${startDate} to ${endDate}`
                : startDate
                  ? `From ${startDate}`
                  : endDate
                    ? `Until ${endDate}`
                    : 'All-time data'}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>CSV Format:</strong> Includes reservation ID, property, guest, dates, revenue,
            commission rate, commission amount, and calculation date. Compatible with Excel.
          </p>
        </div>
      </div>
    </Card>
  )
}
