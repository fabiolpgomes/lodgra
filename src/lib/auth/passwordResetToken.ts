import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

/**
 * Generate a secure random token for password reset
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Create a password reset token in the database
 * Token expires in 24 hours
 */
export async function createPasswordResetToken(userId: string): Promise<string | null> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('password_reset_tokens')
    .insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
    })

  if (error) {
    console.error('Error creating password reset token:', error)
    return null
  }

  return token
}

/**
 * Validate a password reset token
 * Returns user_id if valid, null otherwise
 */
export async function validatePasswordResetToken(token: string): Promise<string | null> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('password_reset_tokens')
    .select('user_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !data) {
    console.error('Error validating token:', error)
    return null
  }

  // Check if token is expired
  if (new Date(data.expires_at) < new Date()) {
    console.error('Token expired')
    return null
  }

  // Check if token was already used
  if (data.used_at) {
    console.error('Token already used')
    return null
  }

  return data.user_id
}

/**
 * Mark a token as used
 */
export async function markTokenAsUsed(token: string): Promise<boolean> {
  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)

  if (error) {
    console.error('Error marking token as used:', error)
    return false
  }

  return true
}
