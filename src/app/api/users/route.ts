import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validate, CreateUserSchema } from '@/lib/schemas/api'
import { writeAuditLog } from '@/lib/audit'
import { parsePage, getRange } from '@/lib/utils/pagination'
import { generateProvisionalPassword } from '@/lib/auth/generateProvisionalPassword'
import { sendNewUserWelcomeEmail } from '@/lib/email/newUserWelcome'
import { createPasswordResetToken } from '@/lib/auth/passwordResetToken'

const USERS_PAGE_SIZE = 50

// GET /api/users — listar utilizadores paginados
export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const sp = Object.fromEntries(request.nextUrl.searchParams.entries())
  const page = parsePage(sp)
  const limit = Math.min(Math.max(parseInt(sp.limit ?? '50', 10) || USERS_PAGE_SIZE, 1), 200)
  const { from, to } = getRange(page, limit)

  const supabase = await createClient()

  const [
    { data: profiles, count: total, error },
    { data: userProperties },
    { data: properties },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to),
    supabase.from('user_properties').select('user_id, property_id, properties(id, name)'),
    supabase.from('properties').select('id, name').order('name'),
  ])

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar utilizadores' }, { status: 500 })
  }

  const usersWithProperties = (profiles ?? []).map(profile => ({
    ...profile,
    assigned_properties: userProperties
      ?.filter(up => up.user_id === profile.id)
      .map(up => up.properties) || [],
  }))

  return NextResponse.json({
    users: usersWithProperties,
    properties: properties || [],
    pagination: { page, limit, total: total ?? 0, pages: Math.ceil((total ?? 0) / limit) },
  })
}

// POST /api/users — criar novo utilizador
export async function POST(request: Request) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const body = await request.json()
  const validation = validate(CreateUserSchema, body)
  if (!validation.ok) return validation.response

  const { email, full_name, password, role, access_all_properties, property_ids } = validation.data

  // Herdar organization_id do utilizador que faz o pedido
  const organizationId = auth.organizationId
  if (!organizationId) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Gerar senha provisória se não fornecida
  const finalPassword = password || generateProvisionalPassword()
  const isProvisionalPassword = !password

  // Criar utilizador via Admin API
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: finalPassword,
    email_confirm: true,
    user_metadata: {
      full_name,
      organization_id: organizationId,
      role: role || 'viewer',
    },
  })

  if (createError) {
    return NextResponse.json(
      { error: createError.message },
      { status: 400 }
    )
  }

  // Criar/atualizar perfil (upsert porque o trigger pode já ter criado)
  const { error: profileError } = await adminClient
    .from('user_profiles')
    .upsert({
      id: newUser.user.id,
      email,
      full_name,
      role: role || 'viewer',
      access_all_properties: access_all_properties || false,
      organization_id: organizationId,
      password_reset_required: isProvisionalPassword,
    }, { onConflict: 'id' })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json(
      { error: 'Erro ao criar perfil: ' + profileError.message },
      { status: 500 }
    )
  }

  // Garantir que password_reset_required está correcto (evita race condition com trigger)
  if (isProvisionalPassword) {
    await adminClient
      .from('user_profiles')
      .update({ password_reset_required: true })
      .eq('id', newUser.user.id)
  }

  // Atribuir propriedades
  if (property_ids && property_ids.length > 0) {
    const propertyInserts = property_ids.map((propertyId: string) => ({
      user_id: newUser.user.id,
      property_id: propertyId,
    }))

    const { error: propError } = await adminClient
      .from('user_properties')
      .insert(propertyInserts)

    if (propError) {
      console.error('Erro ao atribuir propriedades:', propError)
    }
  }

  // Enviar email de boas-vindas com token seguro (se aplicável)
  if (isProvisionalPassword) {
    // Gerar token seguro para criar senha (com retry)
    let resetToken = await createPasswordResetToken(newUser.user.id)

    // Retry uma vez se falhar
    if (!resetToken) {
      console.warn(`Retry: Tentando criar token de reset novamente para ${newUser.user.id}`)
      resetToken = await createPasswordResetToken(newUser.user.id)
    }

    if (resetToken) {
      const emailSent = await sendNewUserWelcomeEmail({
        email,
        fullName: full_name,
        provisionalPassword: finalPassword,
        resetToken,
      })

      if (!emailSent) {
        console.error(`Falha ao enviar email de boas-vindas para ${email}. Verifique RESEND_API_KEY.`)
      }
    } else {
      console.error(`Falha ao criar token de reset para utilizador ${newUser.user.id} após 2 tentativas. Email de boas-vindas não enviado.`)
      // IMPORTANTE: Usuário foi criado mas email não foi enviado — admin deve reenviar via endpoint resend-welcome-email
    }
  }

  await writeAuditLog({
    userId: auth.userId!,
    action: 'create',
    resourceType: 'user',
    resourceId: newUser.user.id,
    details: { email, role, access_all_properties, provisionalPassword: isProvisionalPassword },
  })

  return NextResponse.json({
    success: true,
    userId: newUser.user.id,
    provisionalPassword: isProvisionalPassword ? finalPassword : null
  })
}

// PATCH /api/users — atualizar role de utilizador
export async function PATCH(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const body = await request.json()
  const { userId, role } = body

  if (!userId || !role) {
    return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 })
  }

  if (!['admin', 'gestor', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Verificar se utilizador alvo é admin — não permitir alterar role
  const { data: targetProfile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .eq('organization_id', auth.organizationId)
    .single()

  if (targetProfile?.role === 'admin') {
    return NextResponse.json(
      { error: 'Não é possível alterar o role do utilizador administrador' },
      { status: 403 }
    )
  }

  // Update user profile role
  const { error } = await adminClient
    .from('user_profiles')
    .update({ role })
    .eq('id', userId)
    .eq('organization_id', auth.organizationId)

  if (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
  }

  await writeAuditLog({
    userId: auth.userId!,
    action: 'update',
    resourceType: 'user',
    resourceId: userId,
    details: { role },
  })

  return NextResponse.json({ success: true })
}

// DELETE /api/users — remover utilizador
export async function DELETE(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const body = await request.json()
  const { userId } = body

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Verificar se utilizador alvo é admin — não permitir eliminar
  const { data: targetProfile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .eq('organization_id', auth.organizationId)
    .single()

  if (targetProfile?.role === 'admin') {
    return NextResponse.json(
      { error: 'Não é possível eliminar o utilizador administrador' },
      { status: 403 }
    )
  }

  // Delete user profile and related records
  const { error: profileError } = await adminClient
    .from('user_profiles')
    .delete()
    .eq('id', userId)
    .eq('organization_id', auth.organizationId)

  if (profileError) {
    console.error('Error deleting user profile:', profileError)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }

  await writeAuditLog({
    userId: auth.userId!,
    action: 'delete',
    resourceType: 'user',
    resourceId: userId,
    details: {},
  })

  return NextResponse.json({ success: true })
}
