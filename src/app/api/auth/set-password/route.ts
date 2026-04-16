import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validatePasswordResetToken, markTokenAsUsed } from '@/lib/auth/passwordResetToken'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Validate token
    const userId = await validatePasswordResetToken(token)

    if (!userId) {
      return NextResponse.json(
        { error: 'Token inválido, expirado ou já utilizado' },
        { status: 401 }
      )
    }

    // Update user password
    const adminClient = createAdminClient()

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      {
        password,
        user_metadata: {
          updated_at: new Date().toISOString(),
        },
      }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar senha' },
        { status: 500 }
      )
    }

    // Mark token as used
    const tokenUsed = await markTokenAsUsed(token)

    if (!tokenUsed) {
      console.warn('Failed to mark token as used for user:', userId)
    }

    // Reset password_reset_required flag
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .update({ password_reset_required: false })
      .eq('id', userId)

    if (profileError) {
      console.warn('Failed to update password_reset_required flag:', profileError)
    }

    return NextResponse.json({
      success: true,
      message: 'Senha criada com sucesso',
    })
  } catch (error) {
    console.error('Error setting password:', error)
    return NextResponse.json(
      { error: 'Erro ao criar senha' },
      { status: 500 }
    )
  }
}
