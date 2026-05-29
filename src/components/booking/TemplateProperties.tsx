'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo } from 'react'

interface Property {
  id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  price_per_night?: number
}

interface TemplatePropertiesProps {
  properties: Property[]
  featuredPropertyIds?: string[] | null
  showAllProperties?: boolean
  templateType: 'standard' | 'luxury' | 'budget'
  orgSlug: string
}

export function TemplateProperties({
  properties,
  featuredPropertyIds,
  showAllProperties = true,
  templateType,
  orgSlug,
}: TemplatePropertiesProps) {
  const filteredProperties = useMemo(() => {
    if (!featuredPropertyIds || featuredPropertyIds.length === 0 || showAllProperties) {
      return properties
    }

    // Filter to featured properties only
    const featured = properties.filter((p) => featuredPropertyIds.includes(p.id))

    // Preserve order from featuredPropertyIds
    return featured.sort(
      (a, b) => featuredPropertyIds.indexOf(a.id) - featuredPropertyIds.indexOf(b.id),
    )
  }, [properties, featuredPropertyIds, showAllProperties])

  const gridClass = useMemo(() => {
    return {
      standard: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
      luxury: 'grid-cols-1 md:grid-cols-2 gap-8',
      budget: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4',
    }[templateType]
  }, [templateType])

  const cardClass = useMemo(() => {
    return {
      standard: 'rounded-lg shadow-md hover:shadow-lg transition-shadow',
      luxury: 'rounded-xl shadow-lg hover:shadow-2xl transition-shadow overflow-hidden',
      budget: 'rounded border border-gray-200 shadow-sm hover:shadow-md transition-shadow',
    }[templateType]
  }, [templateType])

  const imageHeightClass = useMemo(() => {
    return {
      standard: 'h-48',
      luxury: 'h-80',
      budget: 'h-32',
    }[templateType]
  }, [templateType])

  const titleClass = useMemo(() => {
    return {
      standard: 'text-lg font-semibold',
      luxury: 'text-xl font-light tracking-wide',
      budget: 'text-base font-semibold',
    }[templateType]
  }, [templateType])

  const priceClass = useMemo(() => {
    return {
      standard: 'text-sm text-gray-600',
      luxury: 'text-lg text-gray-700 font-light',
      budget: 'text-sm font-bold text-blue-600',
    }[templateType]
  }, [templateType])

  const showFeaturedCount =
    !showAllProperties && featuredPropertyIds && featuredPropertyIds.length > 0

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50" data-testid="template-properties">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            {showFeaturedCount ? 'Featured Properties' : 'All Properties'}
          </h2>
          {showFeaturedCount && (
            <p className="text-gray-600 mt-2">
              Showing {filteredProperties.length} featured{' '}
              {filteredProperties.length === 1 ? 'property' : 'properties'}
            </p>
          )}
        </div>

        {filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No properties available</p>
          </div>
        ) : (
          <div className={`grid ${gridClass}`}>
            {filteredProperties.map((property) => (
              <Link
                key={property.id}
                href={`/${orgSlug}/properties/${property.id}`}
                className={cardClass}
              >
                <div className="h-full flex flex-col">
                  {property.image_url && (
                    <div className={`relative w-full ${imageHeightClass} bg-gray-200`}>
                      <Image
                        src={property.image_url}
                        alt={property.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className={`${titleClass} text-gray-900`}>{property.name}</h3>
                      {property.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {property.description}
                        </p>
                      )}
                    </div>

                    {property.price_per_night && (
                      <div className={`mt-4 ${priceClass}`}>
                        R$ {property.price_per_night.toFixed(2)}/night
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
