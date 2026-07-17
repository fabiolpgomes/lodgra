import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, MapPin, Users, Plus, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { Button } from '@/components/common/ui/button'
import { getPlanLimits } from '@/lib/billing/plans'
import { PublicUrlBadge } from '@/components/features/properties/PublicUrlBadge'
import { PublicPagesUsageBar } from '@/components/features/properties/PublicPagesUsageBar'
import { PremiumCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'

export default async function PropertiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
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
      <PremiumPageShell>
        <PremiumPageHeader
          title="Propriedades"
          description="Gerencie suas propriedades e anúncios"
          badge={planName}
          icon={Building2}
          actions={canCreate && (
            <Button asChild variant="action">
              <Link href={`/${locale}/properties/new`} className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Nova Propriedade
              </Link>
            </Button>
          )}
        />

        <div className="border-b border-neutral-200/60" />

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
          <PremiumCard className="p-12 text-center">
            <Home className="h-16 w-16 text-brand-text-medium mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-brand-text-dark mb-2">
              Nenhuma propriedade cadastrada
            </h3>
            <p className="text-brand-text-medium mb-6">
              {canCreate
                ? 'Comece adicionando sua primeira propriedade para começar a gerenciar seus alojamentos.'
                : 'Nenhuma propriedade atribuída à sua conta.'}
            </p>
          {canCreate && (
            <Button asChild variant="action">
              <Link href={`/${locale}/properties/new`} className="inline-flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Adicionar Primeira Propriedade
              </Link>
            </Button>
          )}
          </PremiumCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                canEdit={canEdit}
                locale={locale}
              />
            ))}
          </div>
        )}
      </PremiumPageShell>
    </AuthLayout>
  )
}

function PropertyCard({ property, canEdit, locale }: {
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
    currency?: string | null
  }
  canEdit: boolean
  locale: string
}) {
  return (
    <Link href={`/${locale}/properties/${property.id}`}>
      <div className={`be-card be-card-hover group p-5 cursor-pointer ${!property.is_active ? 'opacity-60' : ''}`}>

        {/* Type + Status */}
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-brand-bg text-brand-text-medium tracking-wide transition-colors group-hover:text-brand-gold">
            {property.property_type || 'apartamento'}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold ${
            property.is_active
              ? 'bg-[#ECFDF5] text-[#059669]'
              : 'bg-gray-100 text-gray-600'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${property.is_active ? 'bg-[#059669]' : 'bg-gray-400'}`} />
            {property.is_active ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-sm font-semibold text-brand-text-dark leading-snug mb-3 transition-colors group-hover:text-brand-gold">
          {property.name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-brand-text-medium mb-3">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs">
            {property.city}{property.country ? `, ${property.country}` : ''}
          </span>
        </div>

        {/* Capacity row */}
        <div className="flex items-center gap-4 text-xs text-brand-text-medium mb-4">
          <div className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            <span>{property.bedrooms || 0} quartos</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{property.max_guests || 0} hóspedes</span>
          </div>
          {property.currency && (
            <span className="ml-auto inline-flex items-center justify-center h-4 px-1.5 text-[10px] font-bold uppercase tracking-wider rounded"
              style={{
                background: property.currency === 'EUR' ? '#EFF6FF' : property.currency === 'BRL' ? '#ECFDF5' : '#FEF9C3',
                color: property.currency === 'EUR' ? '#10203E' : property.currency === 'BRL' ? '#059669' : '#92400e',
              }}>
              {property.currency}
            </span>
          )}
        </div>

        {/* Public page badge + toggle */}
        <div className="border-t border-brand-bg pt-3">
          <PublicUrlBadge
            propertyId={property.id}
            slug={property.slug ?? null}
            isPublic={property.is_public ?? false}
            canEdit={canEdit}
          />
        </div>
      </div>
    </Link>
  )
}
