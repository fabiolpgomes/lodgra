import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { calcManagementFee, calcOwnerNet } from '@/lib/financial/calculations'
import { requirePlanFeature } from '@/lib/billing/requirePlanFeature'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requirePlanFeature('ownerReports')
    if (!gate.authorized) return gate.response

    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'Parâmetros from e to são obrigatórios' }, { status: 400 })
    }

    const supabase = await createClient()

    // Buscar proprietário — filtrar por org explicitamente (defence-in-depth além de RLS)
    const ownerQuery = supabase
      .from('owners')
      .select('id, full_name, email, preferred_currency')
      .eq('id', id)

    if (auth.organizationId) {
      ownerQuery.eq('organization_id', auth.organizationId)
    }

    const { data: owner, error: ownerError } = await ownerQuery.single()

    if (ownerError || !owner) {
      return NextResponse.json({ error: 'Proprietário não encontrado' }, { status: 404 })
    }

    // Buscar propriedades do proprietário — filtrar por org explicitamente
    const propertiesQuery = supabase
      .from('properties')
      .select('id, name, currency, management_percentage')
      .eq('owner_id', id)

    if (auth.organizationId) {
      propertiesQuery.eq('organization_id', auth.organizationId)
    }

    const { data: properties } = await propertiesQuery

    if (!properties || properties.length === 0) {
      return NextResponse.json({
        owner,
        properties: [],
        summary: { revenue: 0, managementFee: 0, expenses: 0, ownerNet: 0 },
      })
    }

    const propertyIds = properties.map(p => p.id)

    // Buscar anúncios das propriedades
    const { data: listings } = await supabase
      .from('property_listings')
      .select('id, property_id')
      .in('property_id', propertyIds)

    const listingIds = listings?.map(l => l.id) ?? []
    const listingToProperty: Record<string, string> = {}
    listings?.forEach(l => { listingToProperty[l.id] = l.property_id })

    // Buscar reservas confirmadas no período
    const reservationsQuery = supabase
      .from('reservations')
      .select('total_amount, property_listing_id')
      .eq('status', 'confirmed')
      .gte('check_in', from)
      .lte('check_in', to)

    if (listingIds.length > 0) {
      reservationsQuery.in('property_listing_id', listingIds)
    } else {
      // Sem anúncios = sem reservas
      return NextResponse.json({
        owner,
        properties: properties.map(p => ({
          ...p,
          revenue: 0,
          managementFee: 0,
          expenses: 0,
          ownerNet: 0,
        })),
        summary: { revenue: 0, managementFee: 0, expenses: 0, ownerNet: 0 },
      })
    }

    const { data: reservations } = await reservationsQuery

    // Buscar despesas no período
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, property_id')
      .gte('expense_date', from)
      .lte('expense_date', to)
      .in('property_id', propertyIds)

    // Agregar por propriedade
    const revenueByProperty: Record<string, number> = {}
    const expensesByProperty: Record<string, number> = {}

    reservations?.forEach(r => {
      const propId = listingToProperty[r.property_listing_id]
      if (propId) {
        revenueByProperty[propId] = (revenueByProperty[propId] ?? 0) + Number(r.total_amount ?? 0)
      }
    })

    expenses?.forEach(e => {
      expensesByProperty[e.property_id] = (expensesByProperty[e.property_id] ?? 0) + Number(e.amount)
    })

    // Montar resultado por propriedade
    const propertyResults = properties.map(p => {
      const revenue = revenueByProperty[p.id] ?? 0
      const mgmtPct = Number(p.management_percentage ?? 0)
      const managementFee = calcManagementFee(revenue, mgmtPct)
      const ownerNet = calcOwnerNet(revenue, mgmtPct)
      const expensesTotal = expensesByProperty[p.id] ?? 0

      return {
        id: p.id,
        name: p.name,
        currency: p.currency,
        management_percentage: mgmtPct,
        revenue,
        managementFee,
        expenses: expensesTotal,
        ownerNet: ownerNet - expensesTotal,
      }
    })

    // Totais
    const summary = propertyResults.reduce(
      (acc, p) => ({
        revenue: acc.revenue + p.revenue,
        managementFee: acc.managementFee + p.managementFee,
        expenses: acc.expenses + p.expenses,
        ownerNet: acc.ownerNet + p.ownerNet,
      }),
      { revenue: 0, managementFee: 0, expenses: 0, ownerNet: 0 }
    )

    return NextResponse.json({ owner, properties: propertyResults, summary })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
