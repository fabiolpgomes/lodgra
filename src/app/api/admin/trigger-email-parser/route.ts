import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Trigger Email Parser cron job manually
 * Requires only authentication (any authenticated user)
 * Calls the actual cron endpoint with CRON_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('[trigger-email-parser] Auth attempt:', { user: user?.email, authError })

    if (!user) {
      console.error('[trigger-email-parser] No user found, returning 401')
      return NextResponse.json(
        { error: 'Não autenticado', details: 'Sessão inválida ou expirada' },
        { status: 401 }
      )
    }

    const cronSecret = process.env.CRON_SECRET
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    console.log('[trigger-email-parser] Calling email-parser:', {
      url: `${appUrl}/api/cron/email-parser`,
      hasCronSecret: !!cronSecret,
      cronSecretLength: cronSecret?.length
    })

    // Construir headers - só adicionar Authorization se CRON_SECRET existe
    const headers: Record<string, string> = {}
    if (cronSecret) {
      headers['Authorization'] = `Bearer ${cronSecret}`
    }

    console.log('[trigger-email-parser] Fetch headers:', {
      headerCount: Object.keys(headers).length,
      hasAuth: 'Authorization' in headers,
      authHeaderLength: headers['Authorization']?.length,
    })

    const res = await fetch(`${appUrl}/api/cron/email-parser`, {
      method: 'GET',
      headers,
    })

    console.log('[trigger-email-parser] Email-parser response:', {
      status: res.status,
      statusText: res.statusText
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[trigger-email-parser] Error response from email-parser:', data)
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[trigger-email-parser] Error:', errorMessage)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
