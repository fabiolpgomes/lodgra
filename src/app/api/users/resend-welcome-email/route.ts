import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPasswordResetToken } from '@/lib/auth/passwordResetToken'
import { sendNewUserWelcomeEmail } from '@/lib/email/newUserWelcome'

/**
 * POST /api/users/resend-welcome-email
 * Resend welcome email with password reset token
 * Useful when email fails to send initially
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const body = await request.json()
  const { userId } = body

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Get user profile
  const { data: profile, error: profileError } = await adminClient
    .from('user_profiles')
    .select('id, email, full_name, role, organization_id')
    .eq('id', userId)
    .eq('organization_id', auth.organizationId)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Generate new reset token
  const resetToken = await createPasswordResetToken(userId)

  if (!resetToken) {
    return NextResponse.json(
      { error: 'Failed to generate password reset token' },
      { status: 500 }
    )
  }

  // Send welcome email
  const emailSent = await sendNewUserWelcomeEmail({
    email: profile.email,
    fullName: profile.full_name,
    provisionalPassword: '', // Not sending provisional password on resend
    resetToken,
  })

  if (!emailSent) {
    return NextResponse.json(
      { error: 'Failed to send welcome email. Check RESEND_API_KEY configuration.' },
      { status: 500 }
    )
  }

  // Ensure password_reset_required is true
  await adminClient
    .from('user_profiles')
    .update({ password_reset_required: true })
    .eq('id', userId)

  return NextResponse.json({
    success: true,
    message: `Welcome email resent to ${profile.email}`,
  })
}
