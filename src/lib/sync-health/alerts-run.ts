import { Resend } from 'resend'
import type { createAdminClient } from '@/lib/supabase/admin'
import { getTenantNotificationEmails } from '@/lib/email/tenant-recipients'
import { loadSyncHealth } from './load'
import { planSyncAlerts, renderSyncAlertEmail, type AlertState } from './alerts'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>
const ALERT_LOCALE = 'pt-BR'

export type SyncAlertOutcome = 'sent' | 'nothing_due' | 'no_recipients' | 'email_unavailable' | 'failed'

/** Evaluates one tenant and, when something is new or a reminder is due, e-mails its admins one digest. */
export async function runSyncAlertsForOrganization(db: AdminClient, organizationId: string, now = new Date()): Promise<SyncAlertOutcome> {
  const health = await loadSyncHealth(db, organizationId, ALERT_LOCALE, now)
  const { data: states, error } = await db.from('sync_action_states')
    .select('action_key, dismissed_at, first_notified_at, last_notified_at')
    .eq('organization_id', organizationId)
  if (error) return 'failed'

  const plan = planSyncAlerts(health.actions, (states ?? []) as AlertState[], now)

  if (plan.resolvedKeys.length) {
    // Rows that only held alert bookkeeping (never dismissed) go away with the problem.
    await db.from('sync_action_states').delete()
      .eq('organization_id', organizationId).is('dismissed_at', null).in('action_key', plan.resolvedKeys)
  }
  if (!plan.send) return 'nothing_due'

  const apiKey = process.env.RESEND_API_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lodgra.io'
  if (!apiKey) return 'email_unavailable'

  const recipients = await getTenantNotificationEmails(organizationId)
  if (!recipients.length) return 'no_recipients'

  const { data: org } = await db.from('organizations').select('name').eq('id', organizationId).maybeSingle()
  const email = renderSyncAlertEmail(plan, { appUrl, locale: ALERT_LOCALE, organizationName: org?.name ?? null })
  const { error: sendError } = await new Resend(apiKey).emails.send({
    from: process.env.EMAIL_FROM || 'Lodgra <noreply@resend.dev>',
    to: recipients,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
  if (sendError) return 'failed'

  const stamp = now.toISOString()
  const previous = new Map((states ?? []).map(row => [row.action_key, row.first_notified_at as string | null]))
  const { error: saveError } = await db.from('sync_action_states').upsert(
    plan.items.map(({ action }) => ({
      organization_id: organizationId,
      action_key: action.key,
      first_notified_at: previous.get(action.key) ?? stamp,
      last_notified_at: stamp,
      updated_at: stamp,
    })),
    { onConflict: 'organization_id,action_key' },
  )
  return saveError ? 'failed' : 'sent'
}
