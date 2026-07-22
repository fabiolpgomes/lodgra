import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { organizationIdFromRecipient, platformFromSender } from '@/lib/email-reconciliation/inbound'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY
  const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET
  if (!apiKey || !webhookSecret) {
    console.error('[ResendInbound] Missing server configuration')
    return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 })
  }

  const payload = await request.text()
  const resend = new Resend(apiKey)

  let event
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get('svix-id') ?? '',
        timestamp: request.headers.get('svix-timestamp') ?? '',
        signature: request.headers.get('svix-signature') ?? '',
      },
      webhookSecret,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'email.received') return NextResponse.json({ ignored: true })

  const { data: email, error: receivingError } = await resend.emails.receiving.get(event.data.email_id)
  if (receivingError || !email) {
    console.error('[ResendInbound] Could not retrieve received email', receivingError)
    return NextResponse.json({ error: 'Email retrieval failed' }, { status: 502 })
  }

  const acceptedDomains = (process.env.RESEND_INBOUND_DOMAINS ?? 'lodgra.io')
    .split(',')
    .map((domain) => domain.trim())
  const organizationId = organizationIdFromRecipient(email.to, acceptedDomains)
  if (!organizationId) return NextResponse.json({ error: 'Invalid recipient' }, { status: 422 })

  const supabase = await createAdminClient()
  const { data: organization } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .maybeSingle()
  if (!organization) return NextResponse.json({ error: 'Unknown organization' }, { status: 404 })

  const platform = platformFromSender(email.from)
  const rawContent = email.text?.trim() || email.html?.trim()
  if (!rawContent) return NextResponse.json({ error: 'Empty email body' }, { status: 422 })

  const { error: insertError } = await supabase.from('raw_emails').insert({
    organization_id: organizationId,
    provider: 'resend',
    provider_message_id: email.id,
    recipient: email.to.join(', '),
    sender: email.from,
    subject: email.subject,
    received_at: email.created_at,
    raw_content: rawContent,
    processing_status: platform ? 'pending' : 'rejected',
    last_error: platform ? null : 'Sender not allowlisted',
  })

  if (insertError?.code === '23505') return NextResponse.json({ duplicate: true })
  if (insertError) {
    console.error('[ResendInbound] Staging insert failed', insertError.message)
    return NextResponse.json({ error: 'Persistence failed' }, { status: 500 })
  }

  return NextResponse.json({ accepted: Boolean(platform), platform }, { status: 202 })
}
