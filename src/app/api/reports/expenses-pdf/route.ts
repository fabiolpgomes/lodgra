import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const propertyId = searchParams.get('propertyId') || ''
    const category = searchParams.get('category') || ''

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate e endDate sao obrigatorios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const userPropertyIds = await getUserPropertyIds(supabase)

    let query = supabase
      .from('expenses')
      .select(`
        id,
        expense_date,
        description,
        notes,
        category,
        amount,
        currency,
        properties!inner(id, name, city, currency)
      `)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: true })

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }
    if (userPropertyIds) {
      query = query.in('property_id', userPropertyIds)
    }
    if (category) {
      query = query.eq('category', category)
    }

    const { data: expenses, error } = await query

    if (error) {
      console.error('Error fetching expenses:', error)
      return NextResponse.json({ error: 'Erro ao buscar despesas' }, { status: 500 })
    }

    return NextResponse.json({
      expenses: expenses || [],
      startDate,
      endDate,
      propertyId,
      category,
    })
  } catch (error) {
    console.error('Error generating expenses PDF:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar relatorio' },
      { status: 500 }
    )
  }
}
