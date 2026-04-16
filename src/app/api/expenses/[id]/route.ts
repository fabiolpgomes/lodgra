import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'
import { validate, UpdateExpenseSchema } from '@/lib/schemas/api'
import { writeAuditLog } from '@/lib/audit'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id } = await params
    const body = await request.json()

    const validation = validate(UpdateExpenseSchema, body)
    if (!validation.ok) return validation.response

    const { property_id, description, amount, category, expense_date, notes } = validation.data
    const supabase = await createClient()

    // Buscar despesa atual
    const { data: currentExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('id, property_id')
      .eq('id', id)
      .single()

    if (fetchError || !currentExpense) {
      return NextResponse.json(
        { error: 'Despesa não encontrada' },
        { status: 404 }
      )
    }

    // Verificar acesso à propriedade (managers com escopo restrito)
    const allowedPropertyIds = await getUserPropertyIds(supabase)
    if (allowedPropertyIds !== null && !allowedPropertyIds.includes(currentExpense.property_id)) {
      return NextResponse.json(
        { error: 'Acesso negado a esta propriedade' },
        { status: 403 }
      )
    }

    // Buscar moeda da propriedade
    const { data: property } = await supabase
      .from('properties')
      .select('currency')
      .eq('id', property_id)
      .single()

    // Atualizar despesa
    const { data: updatedExpense, error: updateError } = await supabase
      .from('expenses')
      .update({
        property_id,
        description,
        amount,
        currency: property?.currency || 'EUR',
        category,
        expense_date,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Erro ao atualizar despesa: ' + updateError.message },
        { status: 500 }
      )
    }

    await writeAuditLog({
      userId: auth.userId!,
      action: 'update',
      resourceType: 'expense',
      resourceId: id,
      details: { property_id, description, amount, category, expense_date },
    })

    return NextResponse.json({
      success: true,
      expense: updatedExpense
    })

  } catch (error: unknown) {
    console.error('Erro na API de atualização:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar despesa' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id } = await params
    const supabase = await createClient()

    // Buscar despesa com property_id para verificação de acesso
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('id, property_id')
      .eq('id', id)
      .single()

    if (fetchError || !expense) {
      return NextResponse.json(
        { error: 'Despesa não encontrada' },
        { status: 404 }
      )
    }

    // Verificar acesso à propriedade (managers com escopo restrito)
    const allowedPropertyIds = await getUserPropertyIds(supabase)
    if (allowedPropertyIds !== null && !allowedPropertyIds.includes(expense.property_id)) {
      return NextResponse.json(
        { error: 'Acesso negado a esta propriedade' },
        { status: 403 }
      )
    }

    // Eliminar a despesa
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Erro ao eliminar despesa: ' + deleteError.message },
        { status: 500 }
      )
    }

    await writeAuditLog({
      userId: auth.userId!,
      action: 'delete',
      resourceType: 'expense',
      resourceId: id,
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    console.error('Erro ao eliminar despesa:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao eliminar despesa' },
      { status: 500 }
    )
  }
}
