import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, MapPin, Users, Plus, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getPlanLimits } from '@/lib/billing/plans'
import { PublicUrlBadge } from '@/components/properties/PublicUrlBadge'
import { PublicPagesUsageBar } from '@/components/properties/PublicPagesUsageBar'

export default async function PropertiesPage() {
  const supabase = await createClient()
  const access = await getUserAccess(supabase)

  if (!access) {
    redirect('/login')
  }

  const { profile, propertyIds } = access
  const userRole = profile.role
  const canCreate = userRole === 'admin' || userRole === 'gestor'
  const canEdit = userRole === 'admin' || userRole === 'gestor'

  let query = supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })

  if (propertyIds) {
    query = query.in('id', propertyIds)
  }

  const { data: properties, error } = await query

  if (error) {
    console.error('Erro ao buscar propriedades:', error)
  }

  // Get org plan for usage bar
  const adminClient = createAdminClient()
  let subscriptionPlan: string | null = null
  
  if (profile.organization_id) {
    const { data: org } = await adminClient
      .from('organizations')
      .select('subscription_plan')
      .eq('id', profile.organization_id)
      .single()
    subscriptionPlan = org?.subscription_plan ?? null
  }

  const limits = getPlanLimits(subscriptionPlan)
  const publicCount = properties?.filter(p => p.is_public).length ?? 0
  const planName = subscriptionPlan
    ? subscriptionPlan.charAt(0).toUpperCase() + subscriptionPlan.slice(1)
    : 'Starter'

  return (
    <AuthLayout profile={profile}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-hs-neutral-900">Propriedades</h2>
            <p className="text-hs-neutral-600 mt-1">
              Gerencie suas propriedades e anúncios
            </p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/properties/new" className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Nova Propriedade
              </Link>
            </Button>
          )}
        </div>

        {/* Public Pages Usage Bar */}
        {properties && properties.length > 0 && (
          <PublicPagesUsageBar
            used={publicCount}
            limit={limits.maxProperties}
            plan={planName}
          />
        )}

        {/* Properties List */}
        {!properties || properties.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-hs-neutral-900 mb-2">
              Nenhuma propriedade cadastrada
            </h3>
            <p className="text-hs-neutral-600 mb-6">
              {canCreate
                ? 'Comece adicionando sua primeira propriedade para começar a gerenciar seus alojamentos.'
                : 'Nenhuma propriedade atribuída à sua conta.'}
            </p>
            {canCreate && (
              <Button asChild>
                <Link href="/properties/new" className="inline-flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Adicionar Primeira Propriedade
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}

      </div>
    </AuthLayout>
  )
}

function PropertyCard({ property, canEdit }: {
  property: {
    id: string
    name: string
    property_type: string | null
    is_active: boolean
    is_public?: boolean
    slug?: string | null
    city: string | null
    country: string | null
    bedrooms: number | null
    max_guests: number | null
  }
  canEdit: boolean
}) {
  return (
    <Link href={`/properties/${property.id}`}>
      <div className={`bg-white rounded-xl border border-hs-border-subtle shadow-sm hover:shadow-lg hover:border-hs-brand-200 transition-all duration-300 p-6 cursor-pointer ${!property.is_active ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="border-hs-border-subtle bg-hs-neutral-50">
            {property.property_type || 'Apartamento'}
          </Badge>
          <div className="flex items-center gap-2">
            {property.is_active ? (
              <Badge className="bg-hs-brand-100 text-hs-brand-700 hover:bg-hs-brand-200">Ativo</Badge>
            ) : (
              <Badge variant="outline">Inativo</Badge>
            )}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-hs-neutral-900 mb-2">
          {property.name}
        </h3>

        <div className="flex items-center gap-2 text-hs-neutral-600 mb-3">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">
            {property.city}, {property.country}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-hs-neutral-600 mb-3">
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            <span>{property.bedrooms || 0} quartos</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{property.max_guests || 0} hóspedes</span>
          </div>
        </div>

        {/* Public page badge + toggle */}
        <PublicUrlBadge
          propertyId={property.id}
          slug={property.slug ?? null}
          isPublic={property.is_public ?? false}
          canEdit={canEdit}
        />
      </div>
    </Link>
  )
}
