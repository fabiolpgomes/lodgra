'use client'

import { Filter } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const REPORT_TABS = [
  { id: 'receitas', label: 'Receitas' },
  { id: 'despesas', label: 'Despesas' },
  { id: 'pl', label: 'P&L' },
  { id: 'canais', label: 'Canais' },
  { id: 'previsao', label: 'Previsão' },
]

interface ReportsFiltersProps {
  properties: { id: string; name: string }[]
  startDate: string
  endDate: string
  propertyId?: string
  activeTab: string
}

function navigate(url: string) {
  window.location.assign(url)
}

export function ReportsFilters({ properties, startDate, endDate, propertyId, activeTab }: ReportsFiltersProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate)
  const [localEndDate, setLocalEndDate] = useState(endDate)
  const [localPropertyId, setLocalPropertyId] = useState(propertyId || '')

  const buildUrl = (tab?: string) => {
    const params = new URLSearchParams()
    params.set('start_date', localStartDate)
    params.set('end_date', localEndDate)
    if (localPropertyId) {
      params.set('property_id', localPropertyId)
    }
    if (tab && tab !== 'receitas') {
      params.set('tab', tab)
    }
    return `/reports?${params.toString()}`
  }

  const handleFilter = () => {
    navigate(buildUrl(activeTab))
  }

  const handleReset = () => {
    navigate('/reports')
  }

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams()
    params.set('start_date', startDate)
    params.set('end_date', endDate)
    if (propertyId) {
      params.set('property_id', propertyId)
    }
    if (tab !== 'receitas') {
      params.set('tab', tab)
    }
    navigate(`/reports?${params.toString()}`)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      {/* Abas */}
      <div className="flex border-b border-gray-200 mb-6">
        {REPORT_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="start_date">
            Data Início
          </Label>
          <Input
            type="date"
            id="start_date"
            value={localStartDate}
            onChange={(e) => setLocalStartDate(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="end_date">
            Data Fim
          </Label>
          <Input
            type="date"
            id="end_date"
            value={localEndDate}
            onChange={(e) => setLocalEndDate(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="property_id">
            Propriedade
          </Label>
          <select
            id="property_id"
            value={localPropertyId}
            onChange={(e) => setLocalPropertyId(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas as propriedades</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <Button
            onClick={handleFilter}
            className="flex-1"
          >
            Filtrar
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
          >
            Limpar
          </Button>
        </div>
      </div>
    </div>
  )
}
