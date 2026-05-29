import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

interface OnboardingOrg {
  id: string
  name: string
  slug: string
  subscription_plan: string | null
  subscription_status: string | null
}

function toSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)

  return slug || 'empresa'
}

function getStripeClients(): Stripe[] {
  const keys = [
    process.env.STRIPE_BR_SECRET_KEY,
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_PT_SECRET_KEY,
  ]
    .map(key => key?.trim())
    .filter((key): key is string => Boolean(key))

  return [...new Set(keys)].map(key => new Stripe(key, { apiVersion: '2026-02-25.clover' }))
}

async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
  if (!sessionId.startsWith('cs_')) return null

  for (const stripe of getStripeClients()) {
    try {
      return await stripe.checkout.sessions.retrieve(sessionId)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (!message.includes('No such checkout.session')) {
        console.warn('[onboarding/session] Stripe retrieve failed:', message)
      }
    }
  }

  return null
}

async function uniqueSlug(adminClient: AdminClient, base: string, currentOrgId?: string | null) {
  let slug = base
  let attempt = 0

  while (attempt < 20) {
    let query = adminClient.from('organizations').select('id').eq('slug', slug)
    if (currentOrgId) query = query.neq('id', currentOrgId)

    const { data: existing } = await query.maybeSingle()
    if (!existing) return slug

    attempt++
    slug = `${base}-${attempt}`
  }

  return `${base}-${Date.now().toString(36)}`
}

export async function getOrganizationFromCheckoutSession(sessionId: string): Promise<{
  organization: OnboardingOrg
  organizationCode: string
  customerEmail: string
}> {
  const session = await retrieveCheckoutSession(sessionId)
  if (!session) throw new Error('checkout_session_not_found')
  if (session.metadata?.source !== 'onboarding') throw new Error('checkout_session_not_onboarding')
  if (session.status !== 'complete' && session.payment_status !== 'paid') {
    throw new Error('checkout_session_not_completed')
  }

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  const customerEmail = session.customer_email || session.customer_details?.email

  if (!customerId || !subscriptionId || !customerEmail) {
    throw new Error('checkout_session_missing_billing_data')
  }

  const adminClient = createAdminClient()
  const plan = session.metadata?.plan || 'essencial'

  const { data: existingOrg } = await adminClient
    .from('organizations')
    .select('id, name, slug, subscription_plan, subscription_status')
    .eq('stripe_customer_id', customerId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingOrg) {
    await adminClient
      .from('organizations')
      .update({
        stripe_subscription_id: subscriptionId,
        subscription_status: 'active',
        plan,
        subscription_plan: plan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingOrg.id)

    return {
      organization: {
        ...existingOrg,
        subscription_plan: plan,
        subscription_status: 'active',
      },
      organizationCode: existingOrg.id,
      customerEmail,
    }
  }

  const fallbackName = customerEmail.split('@')[0] || 'Nova empresa'
  const baseSlug = toSlug(`${fallbackName}-${Date.now().toString(36)}`)
  const slug = await uniqueSlug(adminClient, baseSlug)

  const { data: organization, error } = await adminClient
    .from('organizations')
    .insert({
      name: fallbackName,
      slug,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      plan,
      subscription_plan: plan,
      billing_unit_count: 1,
    })
    .select('id, name, slug, subscription_plan, subscription_status')
    .single()

  if (error || !organization) {
    console.error('[onboarding/session] Organization create failed:', error)
    throw new Error('organization_create_failed')
  }

  return {
    organization,
    organizationCode: organization.id,
    customerEmail,
  }
}

export async function updateCheckoutOrganizationName(sessionId: string, orgName: string) {
  const { organization, organizationCode, customerEmail } = await getOrganizationFromCheckoutSession(sessionId)
  const adminClient = createAdminClient()
  const slug = await uniqueSlug(adminClient, toSlug(orgName), organization.id)

  const { error } = await adminClient
    .from('organizations')
    .update({ name: orgName, slug, updated_at: new Date().toISOString() })
    .eq('id', organization.id)

  if (error) {
    console.error('[onboarding/session] Organization update failed:', error)
    throw new Error('organization_update_failed')
  }

  return {
    organization: {
      ...organization,
      name: orgName,
      slug,
    },
    organizationCode,
    customerEmail,
  }
}
