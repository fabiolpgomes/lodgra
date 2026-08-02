import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MapPin, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { AuthLayout } from '@/components/common/layout/AuthLayout'

export default async function CalendarHubPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const access = await getUserAccess(supabase)

  if (!access) {
    redirect('/login')
  }

  const { propertyIds } = access

  let query = supabase
    .from('properties')
    .select('id, name, address, city, country')
    .order('created_at', { ascending: false })

  if (propertyIds) {
    query = query.in('id', propertyIds)
  }

  const { data: properties } = await query

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Calendar className="w-6 h-6 text-brand-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendários</h1>
            <p className="text-gray-600 mt-1">Gerencie calendários das suas propriedades</p>
          </div>
        </div>

        {/* Properties Grid */}
        {properties && properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((property) => (
              <Link
                key={property.id}
                href={`/${locale}/calendar/${property.id}`}
                className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-6 hover:shadow-lg hover:border-brand-primary transition-all duration-200"
              >
                {/* Content */}
                <div className="flex flex-col h-full">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-brand-primary transition-colors">
                    {property.name}
                  </h3>

                  {/* Location */}
                  <div className="flex items-start gap-2 text-sm text-gray-600 mb-4 flex-1">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>{property.address}</p>
                      <p>{property.city}, {property.country}</p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-2 text-brand-primary font-medium text-sm group-hover:gap-3 transition-all">
                    Abrir Calendário
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/0 to-brand-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma propriedade encontrada</p>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
