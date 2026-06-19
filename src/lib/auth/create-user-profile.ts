import { UserRole } from '@/lib/auth/role-types'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createUserProfile(input: {
  userId: string
  email: string
  fullName: string
  organizationId: string
  role?: string | UserRole
  guestType?: 'staff' | 'owner' | 'cleaner'
  phoneNumber?: string
  acceptsWhatsapp?: boolean
  accessAllProperties?: boolean
  passwordResetRequired?: boolean
  passwordChangedAt?: string | null
}) {
  const supabase = createAdminClient()

  const profile: Record<string, unknown> = {
    id: input.userId,
    email: input.email,
    full_name: input.fullName,
    role: input.role || 'viewer',
    access_all_properties: input.accessAllProperties || false,
    organization_id: input.organizationId,
    password_reset_required: input.passwordResetRequired ?? false,
  }

  if (input.guestType) {
    profile.guest_type = input.guestType
  }

  if (input.phoneNumber) {
    profile.phone_number = input.phoneNumber
  }

  if (input.acceptsWhatsapp !== undefined) {
    profile.accepts_whatsapp = input.acceptsWhatsapp
  }

  if (input.passwordChangedAt !== undefined) {
    profile.password_changed_at = input.passwordChangedAt
  }

  const { error } = await supabase
    .from('user_profiles')
    .upsert(profile, { onConflict: 'id' })

  if (error) {
    throw new Error(`Failed to create user profile: ${error.message}`)
  }

  return profile
}
