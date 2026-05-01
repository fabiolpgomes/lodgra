import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PricingRulesManager } from '@/components/features/pricing/PricingRulesManager'
import { getCurrencySymbol, type CurrencyCode } from '@/lib/utils/currency'

export const dynamic = 'force-dynamic'

export default async function PropertyPricingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const auth = await requireRole(['admin', 'gestor', 'viewer'])
  if (!auth) redirect('/login')

  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('id, name, base_price, organization_id, currency')
    .eq('id', id)
    .single()

  if (!property) notFound()

  const { data: rules } = await supabase
    .from('pricing_rules')
    .select('id, name, start_date, end_date, price_per_night, min_nights')
    .eq('property_id', id)
    .order('start_date', { ascending: true })

  return (
    <AuthLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/properties/${id}/edit`}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Tag size={18} />
              Regras de Preço
            </h1>
            <p className="text-sm text-gray-500">{property.name}</p>
          </div>
        </div>

        {/* Base price info */}
        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Preço base: </span>
            {property.base_price
              ? `${parseFloat(String(property.base_price)).toFixed(2)} ${getCurrencySymbol((property.currency || 'EUR') as CurrencyCode)}/noite`
              : 'Não definido'}
            {' '}— utilizado quando nenhuma regra se aplica.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Para alterar o preço base, aceda à{' '}
            <Link href={`/properties/${id}/edit`} className="underline">
              página de edição da propriedade
            </Link>
            .
          </p>
        </div>

        {/* Manager */}
        <div className="bg-white border rounded-lg p-6">
          <PricingRulesManager
            propertyId={id}
            organizationId={property.organization_id}
            initialRules={rules ?? []}
            currency={property.currency || 'EUR'}
          />
        </div>
      </div>
    </AuthLayout>
  )
}
