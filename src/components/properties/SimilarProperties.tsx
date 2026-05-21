import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Star, MapPin } from 'lucide-react'
import type { SimilarProperty } from '@/lib/supabase/properties'

interface SimilarPropertiesProps {
  properties: SimilarProperty[]
  title?: string
  description?: string
}

export const SimilarProperties: React.FC<SimilarPropertiesProps> = ({
  properties,
  title = 'Propriedades Similares',
  description,
}) => {
  if (!properties || properties.length === 0) {
    return null
  }

  return (
    <section className="py-12 md:py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation (optional, for SEO) */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{title}</h2>
          {description && <p className="text-gray-600 text-lg">{description}</p>}
        </div>

        {/* Grid of Similar Properties */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map(property => (
            <Link
              key={property.id}
              href={`/p/${property.slug}`}
              className="group block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Image */}
              {property.photo_url && (
                <div className="relative overflow-hidden h-48 bg-gray-200">
                  <Image
                    src={property.photo_url}
                    alt={property.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                {/* Name */}
                <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {property.name}
                </h3>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{property.location}</span>
                </div>

                {/* Rating */}
                {property.rating !== undefined && (
                  <div className="flex items-center gap-1 mb-3">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(property.rating || 0)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {property.rating?.toFixed(1)}
                    </span>
                    {property.review_count ? (
                      <span className="text-xs text-gray-500">({property.review_count})</span>
                    ) : null}
                  </div>
                )}

                {/* Price */}
                <div className="text-lg font-bold text-gray-900">
                  {property.currency}
                  {' '}
                  {property.base_price.toFixed(0)}
                  <span className="text-sm font-normal text-gray-600">/noite</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* SEO Footer Text */}
        <div className="mt-12 text-center text-gray-600">
          <p className="text-sm">
            Explore mais propriedades similares em {properties[0]?.city || 'sua região'} e encontre o alojamento perfeito.
          </p>
        </div>
      </div>
    </section>
  )
}
