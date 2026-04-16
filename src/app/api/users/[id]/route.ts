import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { validate, UpdateUserSchema } from '@/lib/schemas/api'
import { writeAuditLog } from '@/lib/audit'
import { invalidateCachedProfile } from '@/lib/cache/profileCache'

// PUT /api/users/[id] — atualizar utilizador
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const { id } = await params
  const body = await request.json()
  const validation = validate(UpdateUserSchema, body)
  if (!validation.ok) return validation.response

  const { full_name, role, access_all_properties, property_ids, password } = validation.data

  const adminClient = createAdminClient()

  // Verificar se utilizador alvo é admin — não permitir editar
  const { data: targetProfile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (targetProfile?.role === 'admin') {
    return NextResponse.json(
      { error: 'Não é possível editar o utilizador administrador' },
      { status: 403 }
    )
  }

  // Atualizar senha via Auth Admin API (se fornecida)
  if (password) {
    const { error: pwError } = await adminClient.auth.admin.updateUserById(id, { password })
    if (pwError) {
      return NextResponse.json(
        { error: 'Erro ao atualizar senha: ' + pwError.message },
        { status: 500 }
      )
    }
  }

  // Atualizar perfil
  const updateData: Record<string, string | boolean> = {}
  if (full_name !== undefined) updateData.full_name = full_name
  if (role !== undefined) updateData.role = role
  if (access_all_properties !== undefined) updateData.access_all_properties = access_all_properties

  if (Object.keys(updateData).length > 0) {
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)

    if (profileError) {
      return NextResponse.json(
        { error: 'Erro ao atualizar perfil: ' + profileError.message },
        { status: 500 }
      )
    }
  }

  // Atualizar propriedades atribuídas
  if (property_ids !== undefined) {
    // Remover todas as propriedades atuais
    await adminClient
      .from('user_properties')
      .delete()
      .eq('user_id', id)

    // Inserir novas propriedades
    if (property_ids.length > 0) {
      const propertyInserts = property_ids.map((propertyId: string) => ({
        user_id: id,
        property_id: propertyId,
      }))

      const { error: propError } = await adminClient
        .from('user_properties')
        .insert(propertyInserts)

      if (propError) {
        return NextResponse.json(
          { error: 'Erro ao atualizar propriedades: ' + propError.message },
          { status: 500 }
        )
      }
    }
  }

  await invalidateCachedProfile(id)

  await writeAuditLog({
    userId: auth.userId!,
    action: 'update',
    resourceType: 'user',
    resourceId: id,
    details: { role, access_all_properties },
  })

  return NextResponse.json({ success: true })
}

// DELETE /api/users/[id] — eliminar utilizador
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const { id } = await params

  const adminClient = createAdminClient()

  // Verificar se utilizador alvo é admin — não permitir eliminar
  const { data: targetProfile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (targetProfile?.role === 'admin') {
    return NextResponse.json(
      { error: 'Não é possível eliminar o utilizador administrador' },
      { status: 403 }
    )
  }

  // Não permitir eliminar a si próprio
  if (id === auth.userId) {
    return NextResponse.json(
      { error: 'Não é possível eliminar o próprio utilizador' },
      { status: 400 }
    )
  }

  // Eliminar perfil (cascade elimina user_properties)
  await adminClient
    .from('user_profiles')
    .delete()
    .eq('id', id)

  // Eliminar utilizador do auth
  const { error } = await adminClient.auth.admin.deleteUser(id)

  if (error) {
    return NextResponse.json(
      { error: 'Erro ao eliminar utilizador: ' + error.message },
      { status: 500 }
    )
  }

  await invalidateCachedProfile(id)

  await writeAuditLog({
    userId: auth.userId!,
    action: 'delete',
    resourceType: 'user',
    resourceId: id,
  })

  return NextResponse.json({ success: true })
}
