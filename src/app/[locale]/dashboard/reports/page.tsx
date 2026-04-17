'use client'

import { useState } from 'react'
import { LazyCommissionDashboard as CommissionDashboard } from '@/components/common/lazy/LazyCharts'

type ReportTab = 'commissions' | 'expenses' | 'revenue' | 'analytics'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('commissions')

  const tabs: Array<{ id: ReportTab; label: string; description: string }> = [
    { id: 'commissions', label: 'Commissions', description: 'Platform commission tracking' },
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
                    ? 'border-blue-500 text-blue-600'
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
