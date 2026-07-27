'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Users } from 'lucide-react'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { ForecastingDashboard } from '@/components/RevenueForecasting/ForecastingDashboard'
import { CompetitorDashboard } from '@/components/CompetitorMonitoring/CompetitorDashboard'

type TabType = 'forecasting' | 'competitor'

interface PricingPageContentProps {
  property: {
    id: string
    name: string
    organization_id: string
    currency: string
  }
  locale: string
}

export function PricingPageContent({ property, locale }: PricingPageContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>('forecasting')

  const tabs = [
    { id: 'forecasting' as const, label: 'Previsões de Receita', icon: TrendingUp },
    { id: 'competitor' as const, label: 'Monitoramento Concorrente', icon: Users },
  ]

  return (
    <AuthLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/${locale}/properties/${property.id}/edit`}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp size={20} />
              Análise de Preços
            </h1>
            <p className="text-sm text-gray-600">{property.name}</p>
          </div>
        </div>

        {/* Info: Pricing moved to Calendar */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900">
            <span className="font-medium">ℹ️ Gestão de Preços:</span> Os preços são agora definidos direto no calendário.
            Aceda à <Link href={`/${locale}/calendar/${property.id}`} className="underline font-medium">
              página do calendário
            </Link> para gerenciar preços por dia.
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white border rounded-t-lg">
          <div className="flex border-b bg-gray-50 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'forecasting' && (
              <div>
                <ForecastingDashboard
                  propertyId={property.id}
                  propertyName={property.name}
                />
              </div>
            )}

            {activeTab === 'competitor' && (
              <div>
                <CompetitorDashboard
                  propertyId={property.id}
                  propertyName={property.name}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
