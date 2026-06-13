import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/calendar/blocks/debug/auth-check
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json({ error: 'Not authenticated', userError }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, organization_id, role, email')
      .eq('id', user.id)
      .single()

    // Get user's organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)

    return NextResponse.json({
      authenticated: !!user,
      userId: user.id,
      userEmail: user.email,
      profile: profile ? {
        id: profile.id,
        organization_id: profile.organization_id,
        role: profile.role,
      } : null,
      profileError: profileError ? { message: profileError.message, code: profileError.code } : null,
      organizationsCount: orgs?.length || 0,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
