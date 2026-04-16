import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { requirePlanFeature } from '@/lib/billing/requirePlanFeature'

// Expense categories deductible under Categoria F (Rendimentos Prediais) in Portugal.
// Valid DB categories: cleaning, maintenance, utilities, taxes, insurance, supplies, repairs, marketing, management
// Deductible: maintenance (obras/conservação), repairs (reparações), insurance (seguros), taxes (impostos/taxas locais)
const DEDUCTIBLE_CATEGORIES = ['maintenance', 'repairs', 'insurance', 'taxes']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requirePlanFeature('fiscalCompliance')
    if (!gate.authorized) return gate.response

    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Ano fiscal inválido' }, { status: 400 })
    }

    const from = `${year}-01-01`
    const to = `${year}-12-31`

    const supabase = await createClient()

    // Fetch owner with org filter (defence-in-depth)
    const ownerQuery = supabase
      .from('owners')
      .select('id, full_name, email, preferred_currency, tax_id')
      .eq('id', id)

    if (auth.organizationId) {
      ownerQuery.eq('organization_id', auth.organizationId)
    }

    const { data: owner, error: ownerError } = await ownerQuery.single()

    if (ownerError || !owner) {
      return NextResponse.json({ error: 'Proprietário não encontrado' }, { status: 404 })
    }

    // Fetch properties of this owner
    const propertiesQuery = supabase
      .from('properties')
      .select('id, name, address, currency')
      .eq('owner_id', id)

    if (auth.organizationId) {
      propertiesQuery.eq('organization_id', auth.organizationId)
    }

    const { data: properties } = await propertiesQuery

    if (!properties || properties.length === 0) {
      return NextResponse.json({
        owner, year,
        properties: [],
        summary: { totalRevenue: 0, deductibleExpenses: 0, taxableNet: 0 },
      })
    }

    const propertyIds = properties.map(p => p.id)

    // Fetch listings for revenue aggregation
    const { data: listings } = await supabase
      .from('property_listings')
      .select('id, property_id')
      .in('property_id', propertyIds)

    const listingIds = listings?.map(l => l.id) ?? []
    const listingToProperty: Record<string, string> = {}
    listings?.forEach(l => { listingToProperty[l.id] = l.property_id })

    // Fetch confirmed reservations for the year
    const { data: reservations } = listingIds.length > 0
      ? await supabase
          .from('reservations')
          .select('total_amount, property_listing_id')
          .eq('status', 'confirmed')
          .gte('check_in', from)
          .lte('check_in', to)
          .in('property_listing_id', listingIds)
      : { data: [] }

    // Fetch deductible expenses for the year
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, property_id, category')
      .gte('expense_date', from)
      .lte('expense_date', to)
      .in('property_id', propertyIds)
      .in('category', DEDUCTIBLE_CATEGORIES)

    // Aggregate by property
    const revenueByProperty: Record<string, number> = {}
    const deductibleByProperty: Record<string, number> = {}

    reservations?.forEach(r => {
      const propId = listingToProperty[r.property_listing_id]
      if (propId) {
        revenueByProperty[propId] = (revenueByProperty[propId] ?? 0) + Number(r.total_amount ?? 0)
      }
    })

    expenses?.forEach(e => {
      deductibleByProperty[e.property_id] = (deductibleByProperty[e.property_id] ?? 0) + Number(e.amount)
    })

    const propertyResults = properties.map(p => {
      const totalRevenue = revenueByProperty[p.id] ?? 0
      const deductibleExpenses = deductibleByProperty[p.id] ?? 0
      const taxableNet = totalRevenue - deductibleExpenses

      return {
        id: p.id,
        name: p.name,
        address: p.address || p.name,
        currency: p.currency || 'EUR',
        totalRevenue,
        deductibleExpenses,
        taxableNet,
      }
    })

    const summary = propertyResults.reduce(
      (acc, p) => ({
        totalRevenue: acc.totalRevenue + p.totalRevenue,
        deductibleExpenses: acc.deductibleExpenses + p.deductibleExpenses,
        taxableNet: acc.taxableNet + p.taxableNet,
      }),
      { totalRevenue: 0, deductibleExpenses: 0, taxableNet: 0 }
    )

    return NextResponse.json({ owner, year, properties: propertyResults, summary })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
