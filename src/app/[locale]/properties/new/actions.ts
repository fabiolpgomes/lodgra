'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'

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

export async function createProperty(data: PropertyInput) {
  try {
    // Check authentication and authorization
    const { organizationId } = await requireRole(['admin', 'gestor'])

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
      return { error: error.message }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar propriedade'
    console.error('Create property error:', message)
    return { error: message }
  }
}
