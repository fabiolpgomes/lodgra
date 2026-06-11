import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lodgra.pt'

type FeeEntry = { amount: number; type: string } | null

function buildFeeEntry(amount: number | null | undefined, type: string | null | undefined): FeeEntry {
  if (!amount || amount <= 0) return null
  return { amount, type: type ?? 'per_stay' }
}

export async function GET() {
  const adminClient = createAdminClient()

  // Fetch all public properties with Epic 18.5 fields
  const { data: properties, error } = await adminClient
    .from('properties')
    .select('id, name, description, city, country, address, postal_code, property_type, slug, base_price, currency, min_nights, max_guests, bedrooms, bathrooms, photos, cleaning_fee, cleaning_fee_type, pet_fee, pet_fee_type, checkin_from, checkin_until, checkout_until')
    .eq('is_public', true)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Feed unavailable' }, { status: 503 })
  }

  if (!properties || properties.length === 0) {
    return NextResponse.json(
      { version: '1.0', generated_at: new Date().toISOString(), property_count: 0, properties: [] },
      { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } }
    )
  }

  const propertyIds = properties.map((p) => p.id)
  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Step 1: fetch all listing IDs for public properties + build reverse map
  const { data: listingsData } = await adminClient
    .from('property_listings')
    .select('id, property_id')
    .in('property_id', propertyIds)

  const listingToProperty: Record<string, string> = {}
  const allListingIds: string[] = []
  for (const l of listingsData ?? []) {
    listingToProperty[l.id] = l.property_id
    allListingIds.push(l.id)
  }

  // Step 2: query reservations via listing IDs using correct columns
  const blockedByProperty: Record<string, { start: string; end: string }[]> = {}
  if (allListingIds.length > 0) {
    const { data: reservations } = await adminClient
      .from('reservations')
      .select('property_listing_id, check_in, check_out')
      .in('property_listing_id', allListingIds)
      .in('status', ['confirmed', 'pending_payment', 'pending'])
      .gte('check_out', today)
      .lte('check_in', futureDate)
      .order('check_in', { ascending: true })

    for (const r of reservations ?? []) {
      const propId = listingToProperty[r.property_listing_id]
      if (!propId) continue
      if (!blockedByProperty[propId]) blockedByProperty[propId] = []
      blockedByProperty[propId].push({ start: r.check_in, end: r.check_out })
    }
  }

  // Fetch amenities for all properties from properties.amenities column
  const { data: propertiesWithAmenities } = await adminClient
    .from('properties')
    .select('id, amenities')
    .in('id', propertyIds)

  const amenitiesByProperty: Record<string, string[]> = {}
  for (const prop of propertiesWithAmenities ?? []) {
    if (Array.isArray(prop.amenities) && prop.amenities.length > 0) {
      amenitiesByProperty[prop.id] = prop.amenities
    }
  }

  const feed = properties.map((p) => ({
    id: p.id,
    listing_url: `${APP_URL}/p/${p.slug}`,
    name: p.name,
    ...(p.description && { description: p.description }),
    type: p.property_type ?? 'property',
    address: {
      ...(p.address && { street: p.address }),
      city: p.city ?? '',
      country: p.country ?? '',
      ...(p.postal_code && { postal_code: p.postal_code }),
    },
    capacity: { max_guests: p.max_guests ?? 1 },
    rooms: {
      bedrooms: p.bedrooms ?? 0,
      bathrooms: p.bathrooms ?? 0,
    },
    photos: (p.photos as string[] | null) ?? [],
    amenities: amenitiesByProperty[p.id] ?? [],
    pricing: {
      base_price_per_night: p.base_price ?? 0,
      currency: p.currency,
      min_nights: p.min_nights ?? 1,
      cleaning_fee: buildFeeEntry(p.cleaning_fee, p.cleaning_fee_type),
      pet_fee: buildFeeEntry(p.pet_fee, p.pet_fee_type),
    },
    policies: {
      checkin_from: p.checkin_from ?? null,
      checkin_until: p.checkin_until ?? null,
      checkout_until: p.checkout_until ?? null,
    },
    availability: {
      blocked_ranges: blockedByProperty[p.id] ?? [],
    },
  }))

  return NextResponse.json(
    {
      version: '1.0',
      generated_at: new Date().toISOString(),
      property_count: feed.length,
      properties: feed,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    }
  )
}
