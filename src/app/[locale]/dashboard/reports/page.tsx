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
        console.error('Erro ao carregar os dados:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const tabs: Array<{ id: ReportTab; label: string; description: string }> = [
    { id: 'commissions', label: 'Comissões', description: 'Acompanhamento das comissões da plataforma' },
    { id: 'reservas', label: 'Reservas', description: 'Painel de reservas' },
    { id: 'expenses', label: 'Despesas', description: 'Despesas por propriedade (em breve)' },
    { id: 'revenue', label: 'Receita', description: 'Análise da receita das reservas (em breve)' },
    { id: 'analytics', label: 'Análises', description: 'Análises avançadas (em breve)' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-sm text-gray-600">
              Acompanhe comissões, despesas e receita em todas as suas propriedades
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[color:var(--be-blue)] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Relatório de Despesas</h2>
            <p className="text-gray-600">Em breve. Acompanhe aqui as despesas por propriedade.</p>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Análise de Receita</h2>
            <p className="text-gray-600">Em breve. Analise aqui as tendências de receita das reservas.</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Análises Avançadas</h2>
            <p className="text-gray-600">Em breve. Análises avançadas para os planos Profissional+.</p>
          </div>
        )}
      </div>
    </div>
  )
}
