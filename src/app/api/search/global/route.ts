import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface SearchResult {
  id: string
  type: 'property' | 'reservation' | 'expense' | 'owner'
  title: string
  subtitle?: string
  href: string
  icon?: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createAdminClient()
  const results: SearchResult[] = []

  try {
    // Search properties
    const { data: properties } = await supabase
      .from('properties')
      .select('id, name, city, currency')
      .ilike('name', `%${q}%`)
      .limit(5)

    if (properties) {
      results.push(
        ...properties.map(p => ({
          id: p.id,
          type: 'property' as const,
          title: p.name,
          subtitle: p.city,
          href: `/properties/${p.id}`,
          icon: '🏠',
        }))
      )
    }

    // Search reservations
    const { data: reservations } = await supabase
      .from('reservations')
      .select('id, property_listings(properties(name)), guests(first_name, last_name), check_in')
      .ilike('id', `%${q}%`)
      .limit(5)

    if (reservations) {
      results.push(
        ...reservations
          .filter(r => r.property_listings && r.guests)
          .map(r => {
            const listing = Array.isArray(r.property_listings) ? r.property_listings[0] : r.property_listings
            const property = listing?.properties ? (Array.isArray(listing.properties) ? listing.properties[0] : listing.properties) : null
            const guest = Array.isArray(r.guests) ? r.guests[0] : r.guests

            return {
              id: r.id,
              type: 'reservation' as const,
              title: `Reserva ${r.id.substring(0, 8)}`,
              subtitle: `${guest?.first_name || ''} ${guest?.last_name || ''} - ${property?.name || ''}`,
              href: `/reservations/${r.id}`,
              icon: '📅',
            }
          })
      )
    }

    // Search expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id, description, category, property_id, properties(name)')
      .or(`description.ilike.%${q}%,category.ilike.%${q}%`)
      .limit(5)

    if (expenses) {
      results.push(
        ...expenses.map(e => {
          const props = Array.isArray(e.properties) ? e.properties[0] : e.properties
          return {
            id: e.id,
            type: 'expense' as const,
            title: e.description,
            subtitle: `${e.category} - ${props?.name || ''}`,
            href: `/expenses/${e.id}`,
            icon: '💰',
          }
        })
      )
    }

    // Search owners
    const { data: owners } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .ilike('full_name', `%${q}%`)
      .eq('role', 'proprietario')
      .limit(5)

    if (owners) {
      results.push(
        ...owners.map(o => ({
          id: o.id,
          type: 'owner' as const,
          title: o.full_name,
          subtitle: o.email,
          href: `/owners/${o.id}`,
          icon: '👤',
        }))
      )
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('[Global Search] Error:', error)
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 })
  }
}
