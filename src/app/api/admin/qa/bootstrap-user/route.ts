import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type BootstrapUserBody = {
  userId?: string
  password?: string
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET?.trim()

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as BootstrapUserBody
    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
    const password = typeof body.password === 'string' ? body.password.trim() : ''

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter required' },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()

    const { data: existingUser, error: fetchError } = await adminClient.auth.admin.getUserById(userId)
    if (fetchError || !existingUser.user) {
      return NextResponse.json(
        { error: fetchError?.message || 'User not found' },
        { status: 404 }
      )
    }

    const updatePayload: { email_confirm: boolean; password?: string } = {
      email_confirm: true,
    }

    if (password) {
      updatePayload.password = password
    }

    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      updatePayload
    )

    if (updateError || !updatedUser.user) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to bootstrap user' },
        { status: 500 }
      )
    }

    const { data: profile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('id, email, full_name, organization_id, role, created_at')
      .eq('id', userId)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        email_confirmed_at: updatedUser.user.email_confirmed_at,
      },
      profile: profileError ? null : profile,
      notes: profileError ? `Profile lookup failed: ${profileError.message}` : undefined,
    })
  } catch (error) {
    console.error('[QA Bootstrap] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bootstrap failed' },
      { status: 500 }
    )
  }
}
