import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripePT } from '@/lib/stripe/client-pt'

export async function POST(request: NextRequest) {
  try {
    const { account_id, state: _state } = await request.json()

    if (!account_id) {
      return NextResponse.json({ error: 'Missing account_id' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const account = await stripePT.accounts.retrieve(account_id)

    const { data: org, error } = await adminClient
      .from('organizations')
      .select('id, stripe_pt_connect_id')
      .eq('stripe_pt_connect_id', account_id)
      .single()

    if (error || !org) {
      return NextResponse.json(
        { error: 'Organization not found for this Connect account' },
        { status: 404 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isOnboarded = (account as any).charges_enabled && (account as any).transfers_enabled

    if (isOnboarded) {
      await adminClient
        .from('organizations')
        .update({
          stripe_pt_connect_onboarded: true,
          stripe_pt_connect_id: account_id,
        })
        .eq('id', org.id)

      console.log(`[stripe/connect] Account onboarded successfully: ${account_id}`)
    }

    return NextResponse.json({
      account_id,
      onboarded: isOnboarded,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      charges_enabled: (account as any).charges_enabled,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transfers_enabled: (account as any).transfers_enabled,
    })
  } catch (error) {
    console.error('[stripe/connect] POST callback error:', error)
    return NextResponse.json(
      { error: 'Failed to process Connect callback' },
      { status: 500 }
    )
  }
}
