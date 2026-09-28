'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { prepareAddProperty, reconcileExtraProperties } from '@/lib/billing/extra-properties'
import type { BillingCurrency } from '@/lib/billing/plans'

interface PropertyInput {
  name: string
  owner_id: string | null
  address: string
  city: string
  country: string
  postal_code: string
  property_type: string
  bedrooms: number
  bathrooms: number
  max_guests: number
  currency: string
  management_percentage: number
}

export type CreatePropertyResult =
  | { success: true; charged: boolean }
  | { success?: false; error: string; code?: string; extraPrice?: number; currency?: BillingCurrency; included?: number }

/**
 * confirmExtra: o utilizador aceitou pagar uma propriedade adicional
 * (só é pedido quando o plano já está no limite incluído).
 */
export async function createProperty(data: PropertyInput, confirmExtra = false): Promise<CreatePropertyResult> {
  try {
    // Check authentication and authorization
    const { organizationId } = await requireRole(['admin', 'gestor'])
    if (!organizationId) return { error: 'Organização não encontrada' }

    const capacity = await prepareAddProperty(organizationId, confirmExtra)
    if (capacity.ok === false) {
      if (capacity.code === 'extra_property_confirmation_required') {
        return {
          error: 'Esta propriedade excede as incluídas no seu plano.',
          code: capacity.code,
          extraPrice: capacity.extraPrice,
          currency: capacity.currency,
          included: capacity.included,
        }
      }
      return { error: capacity.message, code: capacity.code }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('properties')
      .insert({
        organization_id: organizationId,
        name: data.name,
        owner_id: data.owner_id,
        address: data.address,
        city: data.city,
        country: data.country,
        postal_code: data.postal_code,
        property_type: data.property_type,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        max_guests: data.max_guests,
        currency: data.currency,
        management_percentage: data.management_percentage,
        is_active: true,
      })

    if (error) {
      console.error('Property insert error:', error)
      if (capacity.charged) await reconcileExtraProperties(organizationId)
      return { error: error.message }
    }

    return { success: true, charged: capacity.charged }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar propriedade'
    console.error('Create property error:', message)
    return { error: message }
  }
}
