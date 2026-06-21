'use client'

import { Filter } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { useRouter } from '@/lib/i18n/routing'

interface ReservationsFiltersProps {
  properties: { id: string; name: string }[]
  startDate: string
  endDate: string
  propertyId?: string
}

export function ReservationsFilters({ properties, startDate, endDate, propertyId }: ReservationsFiltersProps) {
  const router = useRouter()
  const [localStartDate, setLocalStartDate] = useState(startDate)
  const [localEndDate, setLocalEndDate] = useState(endDate)
  const [localPropertyId, setLocalPropertyId] = useState(propertyId || '')

  const buildUrl = (params: Record<string, string>) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.set(key, value)
    })
    return `/reports/reservas${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  }

  const handleFilter = () => {
    router.push(buildUrl({
      start_date: localStartDate,
      end_date: localEndDate,
      property_id: localPropertyId,
    }))
  }

  const handleReset = () => {
    router.push('/reports/reservas')
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-brand-600" />
        <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="start_date">
            Data Início <span className="text-xs text-gray-600">(dd/mm/aaaa)</span>
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
            Data Fim <span className="text-xs text-gray-600">(dd/mm/aaaa)</span>
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
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
