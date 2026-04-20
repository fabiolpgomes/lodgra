import { useState, useEffect } from 'react'
import type { PropertyCardProps } from '@/components/common/public/properties/PropertyCard'
import type { FilterState } from '@/components/common/public/properties/PropertyFilters'
import type { SearchParams } from '@/components/common/public/properties/SearchBar'

export interface PropertiesResponse {
  success: boolean
  data: {
    properties: PropertyCardProps[]
    pagination: {
      currentPage: number
      pageSize: number
      totalItems: number
      totalPages: number
    }
  }
}

export interface UsePropertiesParams extends Partial<FilterState>, Partial<SearchParams> {
  page?: number
}

export function useProperties(params: UsePropertiesParams) {
  const [data, setData] = useState<PropertiesResponse['data'] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const queryParams = new URLSearchParams()

        // Add filters
        if (params.location) {
          queryParams.append('location', params.location)
        }
        if (params.priceMin !== undefined) {
          queryParams.append('priceMin', params.priceMin.toString())
        }
        if (params.priceMax !== undefined) {
          queryParams.append('priceMax', params.priceMax.toString())
        }
        if (params.amenities && params.amenities.length > 0) {
          params.amenities.forEach((amenity) => {
            queryParams.append('amenities', amenity)
          })
        }
        if (params.propertyType) {
          queryParams.append('type', params.propertyType)
        }
        if (params.minRating !== undefined) {
          queryParams.append('minRating', params.minRating.toString())
        }

        // Add search params
        if (params.checkIn) {
          queryParams.append('checkIn', params.checkIn.toString())
        }
        if (params.checkOut) {
          queryParams.append('checkOut', params.checkOut.toString())
        }
        if (params.guests !== undefined) {
          queryParams.append('guests', params.guests.toString())
        }

        // Add pagination
        const page = params.page || 1
        queryParams.append('page', page.toString())
        queryParams.append('limit', '12')

        const url = `/api/properties?${queryParams.toString()}`
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error('Failed to fetch properties')
        }

        const result: PropertiesResponse = await response.json()

        if (result.success) {
          setData(result.data)
        } else {
          setError('Failed to load properties')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperties()
  }, [params])

  return {
    data,
    isLoading,
    error,
  }
}
