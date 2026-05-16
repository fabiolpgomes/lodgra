import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailFromTemplate } from '@/lib/email/service'
import {
  subscriptionRenewalTemplate,
  subscriptionPastDueTemplate,
  subscriptionCanceledTemplate,
  subscriptionUpgradedTemplate,
} from '@/lib/email/templates'

interface SubscriptionEvent {
  customerId: string
  subscriptionId: string
  status: string
  planName?: string
  amount?: number
  currency?: string
  renewalDate?: string
  amountDue?: number
  dueDate?: string
  canceledDate?: string
  oldPlan?: string
  newPlan?: string
  newAmount?: number
  effectiveDate?: string
}

async function getOrganizationEmail(customerId: string): Promise<string | null> {
  const adminClient = createAdminClient()

  const { data: org } = await adminClient
    .from('organizations')
    .select('id, email')
    .eq('stripe_br_customer_id', customerId)
    .single()

  return org?.email || null
}

async function getOrganizationName(customerId: string): Promise<string | null> {
  const adminClient = createAdminClient()

  const { data: org } = await adminClient
    .from('organizations')
    .select('id, name')
    .eq('stripe_br_customer_id', customerId)
    .single()

  return org?.name || null
}

export async function onSubscriptionRenewal(event: SubscriptionEvent): Promise<void> {
  const email = await getOrganizationEmail(event.customerId)
  const _organizationName = await getOrganizationName(event.customerId)

  if (!email || !_organizationName) {
    console.warn(`[alerts] Could not find organization for customer ${event.customerId}`)
    return
  }

  const template = subscriptionRenewalTemplate(
    _organizationName,
    event.planName || 'Subscription',
    event.amount || 0,
    event.currency || 'BRL',
    event.renewalDate || new Date().toISOString()
  )

  try {
    await sendEmailFromTemplate(email, template)
    console.log(`[alerts] Sent renewal alert to ${email}`)
  } catch (error) {
    console.error(`[alerts] Failed to send renewal alert to ${email}:`, error)
  }
}

export async function onSubscriptionPastDue(event: SubscriptionEvent): Promise<void> {
  const email = await getOrganizationEmail(event.customerId)
  const _organizationName = await getOrganizationName(event.customerId)

  if (!email || !_organizationName) {
    console.warn(`[alerts] Could not find organization for customer ${event.customerId}`)
    return
  }

  const template = subscriptionPastDueTemplate(
    _organizationName,
    event.planName || 'Subscription',
    event.amountDue || 0,
    event.currency || 'BRL',
    event.dueDate || new Date().toISOString()
  )

  try {
    await sendEmailFromTemplate(email, template)
    console.log(`[alerts] Sent past-due alert to ${email}`)
  } catch (error) {
    console.error(`[alerts] Failed to send past-due alert to ${email}:`, error)
  }
}

export async function onSubscriptionCanceled(event: SubscriptionEvent): Promise<void> {
  const email = await getOrganizationEmail(event.customerId)
  const _organizationName = await getOrganizationName(event.customerId)

  if (!email || !_organizationName) {
    console.warn(`[alerts] Could not find organization for customer ${event.customerId}`)
    return
  }

  const template = subscriptionCanceledTemplate(
    _organizationName,
    event.planName || 'Subscription',
    event.canceledDate || new Date().toISOString()
  )

  try {
    await sendEmailFromTemplate(email, template)
    console.log(`[alerts] Sent cancellation alert to ${email}`)
  } catch (error) {
    console.error(`[alerts] Failed to send cancellation alert to ${email}:`, error)
  }
}

export async function onSubscriptionUpgraded(event: SubscriptionEvent): Promise<void> {
  const email = await getOrganizationEmail(event.customerId)
  const _organizationName = await getOrganizationName(event.customerId)

  if (!email || !_organizationName) {
    console.warn(`[alerts] Could not find organization for customer ${event.customerId}`)
    return
  }

  const template = subscriptionUpgradedTemplate(
    _organizationName,
    event.oldPlan || 'Previous Plan',
    event.newPlan || 'New Plan',
    event.newAmount || 0,
    event.currency || 'BRL',
    event.effectiveDate || new Date().toISOString()
  )

  try {
    await sendEmailFromTemplate(email, template)
    console.log(`[alerts] Sent upgrade alert to ${email}`)
  } catch (error) {
    console.error(`[alerts] Failed to send upgrade alert to ${email}:`, error)
  }
}
