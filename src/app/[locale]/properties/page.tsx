import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, MapPin, Users, Plus, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { Button } from '@/components/common/ui/button'
import { getPlanLimits } from '@/lib/billing/plans'
import { getCurrencySymbol } from '@/lib/currency/symbols'
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

  const propertyIdsForImages = properties?.map((property) => property.id) ?? []
  const propertyImageMap = new Map<string, string>()

  if (propertyIdsForImages.length > 0) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const { data: propertyImages } = await supabase
      .from('property_images')
      .select('id, property_id, storage_path, display_order, is_primary')
      .in('property_id', propertyIdsForImages)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true })

    const firstImages = new Map<string, { id: string; storage_path: string }>()
    for (const image of propertyImages ?? []) {
      if (!firstImages.has(image.property_id)) {
        firstImages.set(image.property_id, {
          id: image.id,
          storage_path: image.storage_path,
        })
      }
    }

    const imageIds = Array.from(firstImages.values()).map((image) => image.id)
    const { data: variants } = imageIds.length > 0
      ? await supabase
        .from('image_variants')
        .select('property_image_id, storage_path, variant_type')
        .in('property_image_id', imageIds)
      : { data: [] }

    const priority = ['desktop', 'tablet', 'mobile', 'thumb', 'original']
    for (const [propertyId, image] of firstImages) {
      const imageVariants = variants?.filter((variant) => variant.property_image_id === image.id) ?? []
      let storagePath = ''
      for (const variantType of priority) {
        const found = imageVariants.find((variant) => variant.variant_type === variantType)?.storage_path
        if (found) {
          storagePath = found
          break
        }
      }
      if (!storagePath) storagePath = image.storage_path
      if (storagePath && supabaseUrl) {
        propertyImageMap.set(propertyId, `${supabaseUrl}/storage/v1/object/public/property-images/${storagePath}`)
      }
    }
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
                imageUrl={propertyImageMap.get(property.id) ?? null}
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

function PropertyCard({ property, imageUrl, canEdit, locale }: {
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
    base_price?: number | string | null
    currency?: string | null
  }
  imageUrl: string | null
  canEdit: boolean
  locale: string
}) {
  const propertyHref = canEdit
    ? `/${locale}/properties/${property.id}/edit`
    : `/${locale}/properties/${property.id}`
  const basePrice = property.base_price ? Number(property.base_price) : 0
  const currency = property.currency || 'EUR'
  const formattedBasePrice = basePrice > 0
    ? `${getCurrencySymbol(currency)} ${basePrice.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`
    : null

  return (
    <Link href={propertyHref}>
      <div className={`be-card be-card-hover group cursor-pointer overflow-hidden p-0 ${!property.is_active ? 'opacity-60' : ''}`}>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-bg">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`Foto de ${property.name}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-bg text-brand-text-medium">
              <Home className="h-12 w-12 opacity-50" />
            </div>
          )}

          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-white/90 text-brand-blue shadow-sm backdrop-blur transition-colors group-hover:text-brand-gold">
              {property.property_type || 'apartamento'}
            </span>
          </div>

          <div className="absolute right-3 top-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur ${
              property.is_active
                ? 'bg-[#ECFDF5]/95 text-[#059669]'
                : 'bg-brand-white/90 text-brand-text-medium'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${property.is_active ? 'bg-[#059669]' : 'bg-brand-text-medium'}`} />
              {property.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        <div className="p-5">
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

          <div className="mb-4 flex items-end justify-between gap-3 rounded-xl border border-brand-bg bg-brand-white px-3 py-2 shadow-sm transition-colors group-hover:border-brand-gold/45">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">
                Diária mínima
              </p>
              {formattedBasePrice ? (
                <p className="mt-0.5 text-lg font-bold leading-none text-brand-blue transition-colors group-hover:text-brand-gold">
                  {formattedBasePrice}
                </p>
              ) : (
                <p className="mt-0.5 text-sm font-semibold text-brand-text-medium">
                  Não informado
                </p>
              )}
            </div>
            <span className="pb-0.5 text-[11px] font-semibold text-brand-text-medium">
              / noite
            </span>
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
      </div>
    </Link>
  )
}
