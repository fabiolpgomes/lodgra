import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_QUERY_LENGTH = 200

interface SearchResult {
  id: string
  type: 'property' | 'reservation' | 'expense' | 'owner'
  title: string
  subtitle?: string
  href: string
  icon?: string
}

function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&')
}

export async function GET(request: NextRequest) {
  // Add authentication check
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const locale = searchParams.get('locale') || 'pt-BR'

  if (!q || q.length < 2 || q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ results: [] })
  }

  const results: SearchResult[] = []
  const escapedQ = escapeLikePattern(q)

  try {
    // Search properties
    const { data: properties } = await supabase
      .from('properties')
      .select('id, name, city, currency')
      .ilike('name', `%${escapedQ}%`)
      .limit(5)

    if (properties) {
      results.push(
        ...properties.map(p => ({
          id: p.id,
          type: 'property' as const,
          title: p.name,
          subtitle: p.city,
          href: `/${locale}/properties/${p.id}`,
          icon: '🏠',
        }))
      )
    }

    // Search reservations by guest name (more user-friendly than ID)
    const { data: reservations } = await supabase
      .from('reservations')
      .select('id, property_listings(properties(name)), guests(first_name, last_name), check_in')
      .or(`guests.first_name.ilike.%${escapedQ}%,guests.last_name.ilike.%${escapedQ}%`)
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
              href: `/${locale}/reservations/${r.id}`,
              icon: '📅',
            }
          })
      )
    }

    // Search expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id, description, category, property_id, properties(name)')
      .or(`description.ilike.%${escapedQ}%,category.ilike.%${escapedQ}%`)
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
            href: `/${locale}/expenses/${e.id}`,
            icon: '💰',
          }
        })
      )
    }

    // Search owners (no PII exposure - removed email)
    const { data: owners } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', `%${escapedQ}%`)
      .eq('role', 'proprietario')
      .limit(5)

    if (owners) {
      results.push(
        ...owners.map(o => ({
          id: o.id,
          type: 'owner' as const,
          title: o.full_name,
          href: `/${locale}/owners/${o.id}`,
          icon: '👤',
        }))
      )
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('[Global Search] Error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 })
  }
}
