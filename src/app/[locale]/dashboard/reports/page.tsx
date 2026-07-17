'use client'

import { useState, useEffect } from 'react'
import { LazyCommissionDashboard as CommissionDashboard } from '@/components/common/lazy/LazyCharts'
import { ReservationsDashboard } from '@/components/features/reports/ReservationsDashboard'

type ReportTab = 'commissions' | 'expenses' | 'revenue' | 'analytics' | 'reservas'

interface Reservation {
  id: string
  check_in: string
  check_out: string
  status: 'confirmed' | 'pending' | 'cancelled'
  total_amount?: number
  currency?: string
  source?: string
  number_of_guests?: number
  created_at?: string
  platform_fee?: number
  net_amount?: number
  property_listings?: Array<{
    id?: string
    property_id: string
    properties?: Array<{
      id: string
      name: string
      currency: string
      city?: string
    }>
  }>
  guests?: Array<{
    first_name: string
    last_name: string
  }>
}

interface Property {
  id: string
  name: string
  currency?: string
  is_active?: boolean
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('commissions')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [resRes, propsRes] = await Promise.all([
          fetch('/api/reservations?status=confirmed'),
          fetch('/api/properties'),
        ])

        if (resRes.ok) {
          const data = await resRes.json()
          setReservations(data)
        }
        if (propsRes.ok) {
          const data = await propsRes.json()
          setProperties(data)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const tabs: Array<{ id: ReportTab; label: string; description: string }> = [
    { id: 'commissions', label: 'Commissions', description: 'Platform commission tracking' },
    { id: 'reservas', label: 'Reservas', description: 'Reservation dashboard' },
    { id: 'expenses', label: 'Expenses', description: 'Property expenses (coming soon)' },
    { id: 'revenue', label: 'Revenue', description: 'Booking revenue analysis (coming soon)' },
    { id: 'analytics', label: 'Analytics', description: 'Advanced analytics (coming soon)' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track commissions, expenses, and revenue across your properties
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-500 text-[color:var(--be-blue)]'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'commissions' && (
          <div>
            <CommissionDashboard />
          </div>
        )}

        {activeTab === 'reservas' && (
          <div>
            {loading ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600">Carregando...</p>
              </div>
            ) : (
              <ReservationsDashboard
                _reservations={reservations}
                futureReservations={reservations}
                properties={properties}
                _startDate={new Date().toISOString().split('T')[0]}
                _endDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split('T')[0]}
              />
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Expenses Report</h2>
            <p className="text-gray-600">Coming soon. Track property-level expenses here.</p>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Revenue Analysis</h2>
            <p className="text-gray-600">Coming soon. Analyze booking revenue trends here.</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Advanced Analytics</h2>
            <p className="text-gray-600">Coming soon. Advanced analytics for Professional+ plans.</p>
          </div>
        )}
      </div>
    </div>
  )
}
