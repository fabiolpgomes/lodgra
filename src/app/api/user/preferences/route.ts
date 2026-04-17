import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest) {
  try {
    // Verify user is authenticated (all roles can set their own preferences)
    const authResult = await requireRole(['admin', 'gestor', 'viewer', 'guest'])
    if (!authResult.authorized || !authResult.userId) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { preferred_locale } = body

    // Validate locale
    const validLocales = ['pt', 'pt-BR', 'en-US', 'es']
    if (preferred_locale && !validLocales.includes(preferred_locale)) {
      return NextResponse.json(
        { error: `Invalid locale. Must be one of: ${validLocales.join(', ')}` },
        { status: 400 }
      )
    }

    // Update user profile with preferred locale
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('user_profiles')
      .update({ preferred_locale: preferred_locale || null })
      .eq('id', authResult.userId)
      .select()

    if (error) {
      console.error('Error updating user preferences:', error)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in preferences endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated (all roles can read their own preferences)
    const authResult = await requireRole(['admin', 'gestor', 'viewer', 'guest'])
    if (!authResult.authorized || !authResult.userId) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user preferences
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('user_profiles')
      .select('preferred_locale')
      .eq('id', authResult.userId)
      .single()

    if (error) {
      console.error('Error fetching user preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    return NextResponse.json({ preferred_locale: data?.preferred_locale || null })
  } catch (error) {
    console.error('Error in preferences endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
