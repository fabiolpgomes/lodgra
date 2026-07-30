'use client'

import Link from 'next/link'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { AuthLayout } from '@/components/common/layout/AuthLayout'

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

        {/* Notice: Analysis Features Disabled */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-900">
            <span className="font-medium">⚠️ Análise de Preços:</span> As funcionalidades de "Previsões de Receita" e "Monitoramento Concorrente" estão temporariamente desativadas.
            Estas requerem dados históricos e configuração de concorrentes. Volte mais tarde para utilizá-las.
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
