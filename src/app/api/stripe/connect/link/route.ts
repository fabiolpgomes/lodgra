import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripePT } from '@/lib/stripe/client-pt'
import { requireRole } from '@/lib/auth/requireRole'

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    if (!auth.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const adminClient = createAdminClient()
    const { data: org } = await adminClient
      .from('organizations')
      .select('stripe_pt_connect_id')
      .eq('id', auth.organizationId)
      .single()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    let connectId = org?.stripe_pt_connect_id

    if (!connectId) {
      const account = await stripePT.accounts.create({
        type: 'express',
        country: 'PT',
        email: 'noreply@lodgra.com',
      })
      connectId = account.id

      await adminClient
        .from('organizations')
        .update({ stripe_pt_connect_id: connectId })
        .eq('id', auth.organizationId)

      console.log(`[stripe/connect] Created Express account: ${connectId} for org ${auth.organizationId}`)
    }

    const accountLink = await stripePT.accountLinks.create({
      account: connectId,
      type: 'account_onboarding',
      refresh_url: `${baseUrl}/api/stripe/connect/refresh`,
      return_url: `${baseUrl}/dashboard/stripe-connect-success`,
    })

    console.log(`[stripe/connect] Generated onboarding link for ${connectId}`)

    return NextResponse.json({
      url: accountLink.url,
      account_id: connectId,
    })
  } catch (error) {
    console.error('[stripe/connect] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Connect link' },
      { status: 500 }
    )
  }
}
