import { createClient } from '@supabase/supabase-js'

/**
 * Identify organization by user email
 * Uses admin client to bypass RLS
 */
export async function identifyOrgByEmail(email: string): Promise<{
  orgName: string | null
  orgSlug: string | null
  orgLogoUrl: string | null
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        `
        organization_id,
        organizations!inner(
          name,
          slug,
          organization_branding(
            logo_url
          )
        )
      `
      )
      .eq('email', email.toLowerCase())
      .single()

    if (error || !data) {
      return {
        orgName: null,
        orgSlug: null,
        orgLogoUrl: null,
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org = data.organizations as any

    const brandingArray = Array.isArray(org?.organization_branding)
      ? org.organization_branding
      : org?.organization_branding
        ? [org.organization_branding]
        : []

    const branding = brandingArray[0] || null

    return {
      orgName: org?.name ?? null,
      orgSlug: org?.slug ?? null,
      orgLogoUrl: branding?.logo_url ?? null,
    }
  } catch (error) {
    console.error('Error identifying org by email:', error)
    return {
      orgName: null,
      orgSlug: null,
      orgLogoUrl: null,
    }
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
