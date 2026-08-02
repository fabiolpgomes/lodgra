'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronDown, MapPin, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Property {
  id: string
  name: string
  city?: string
  address?: string
}

interface PropertySelectorProps {
  currentPropertyId: string
  onPropertyChange?: (propertyId: string) => void
}

export function PropertySelector({
  currentPropertyId,
  onPropertyChange,
}: PropertySelectorProps) {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const [properties, setProperties] = useState<Property[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { data } = await supabase
          .from('properties')
          .select('id, name, city, address')
          .order('created_at', { ascending: false })

        setProperties(data || [])
      } catch (error) {
        console.error('Erro ao buscar propriedades:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperties()
  }, [])

  const currentProperty = properties.find(p => p.id === currentPropertyId)

  const handlePropertyChange = (propertyId: string) => {
    setIsOpen(false)
    onPropertyChange?.(propertyId)
    router.push(`/${locale}/calendar/${propertyId}`)
  }

  if (isLoading || properties.length <= 1) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
      >
        <Building2 className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-900 max-w-xs truncate">
          {currentProperty?.name || 'Selecionar propriedade'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="max-h-96 overflow-y-auto">
            {properties.map((property) => (
              <button
                key={property.id}
                onClick={() => handlePropertyChange(property.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                  property.id === currentPropertyId ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      property.id === currentPropertyId
                        ? 'text-brand-primary'
                        : 'text-gray-900'
                    }`}>
                      {property.name}
                    </p>
                    {property.city && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {property.city}
                      </p>
                    )}
                  </div>
                  {property.id === currentPropertyId && (
                    <div className="w-2 h-2 rounded-full bg-brand-primary flex-shrink-0 mt-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
