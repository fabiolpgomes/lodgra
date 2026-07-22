'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Tag, TrendingUp, Users } from 'lucide-react'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PricingRulesManager } from '@/components/features/pricing/PricingRulesManager'
import { ForecastingDashboard } from '@/components/RevenueForecasting/ForecastingDashboard'
import { CompetitorDashboard } from '@/components/CompetitorMonitoring/CompetitorDashboard'
import { getCurrencySymbol, type CurrencyCode } from '@/lib/utils/currency'

type TabType = 'pricing' | 'forecasting' | 'competitor'

interface PricingPageContentProps {
  property: {
    id: string
    name: string
    base_price: number | null
    organization_id: string
    currency: string
  }
  rules: Array<{
    id: string
    name: string
    start_date: string
    end_date: string
    price_per_night: number
    min_nights: number
  }>
  locale: string
}

export function PricingPageContent({ property, rules, locale }: PricingPageContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>('pricing')

  const tabs = [
    { id: 'pricing' as const, label: 'Regras de Preço', icon: Tag },
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
              <Tag size={20} />
              Gestão de Preços
            </h1>
            <p className="text-sm text-gray-600">{property.name}</p>
          </div>
        </div>

        {/* Base price info */}
        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Preço base: </span>
            {property.base_price
              ? `${parseFloat(String(property.base_price)).toFixed(2)} ${getCurrencySymbol((property.currency || 'EUR') as CurrencyCode)}/noite`
              : 'Não definido'}
            {' '}— utilizado quando nenhuma regra se aplica.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Para alterar o preço base, aceda à{' '}
            <Link href={`/${locale}/properties/${property.id}/edit`} className="underline">
              página de edição da propriedade
            </Link>
            .
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
            {activeTab === 'pricing' && (
              <div className="space-y-4">
                <PricingRulesManager
                  propertyId={property.id}
                  organizationId={property.organization_id}
                  initialRules={rules ?? []}
                  currency={property.currency || 'EUR'}
                />
              </div>
            )}

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
