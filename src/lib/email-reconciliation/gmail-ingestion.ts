import { createAdminClient } from '@/lib/supabase/admin'
import { getValidAccessToken, fetchEmailsByIds, type ConnectionRow } from '@/lib/email-parser/gmail-client'
import { getFeatureFlagStatus } from './feature-flag'
import { platformFromSender } from './inbound'

const PROVIDER_QUERY = '(from:booking.com OR from:airbnb.com OR from:flatio.com OR from:vrbo.com)'

/** Gmail transports messages to staging; it never writes reservations. */
export async function ingestGmail(organizationId?: string) {
  const db = createAdminClient()
  let query = db.from('email_connections').select('id, organization_id, email, access_token, refresh_token, token_expiry, last_sync_at, sync_page_token, sync_query')
  if (organizationId) query = query.eq('organization_id', organizationId)
  const { data: connections, error } = await query
  if (error) throw new Error('Unable to read Gmail connections')
  const deadline = Date.now() + 210_000
  const results = { processed: 0, staged: 0, duplicates: 0, skipped: 0, errors: 0, connections: connections?.length || 0 }
  for (const connection of (connections || []) as ConnectionRow[]) {
    try {
      if (Date.now() >= deadline) throw new Error('GMAIL_BACKFILL_IN_PROGRESS')
      const flag = await getFeatureFlagStatus(connection.organization_id)
      if (!flag.enabled) { results.skipped++; continue }
      const token = await getValidAccessToken(connection)
      if (!token) throw new Error('GMAIL_REAUTH_REQUIRED')
      const upperBound = Math.floor(Date.now() / 1000)
      const lastSync = connection.last_sync_at ? Date.parse(connection.last_sync_at) : NaN
      const lowerBound = Math.floor((Number.isFinite(lastSync) ? lastSync - 86_400_000 : Date.now() - 90 * 86_400_000) / 1000)
      const scanQuery = connection.sync_query || `${PROVIDER_QUERY} after:${lowerBound} before:${upperBound}`
      let pageToken: string | undefined = connection.sync_page_token || undefined
      const checkpoint = async (token: string | null, done = false) => {
        const { error } = await db.from('email_connections').update({
          sync_page_token: token, sync_query: done ? null : scanQuery,
          ...(done ? { last_sync_at: new Date(Number(scanQuery.match(/before:(\d+)/)?.[1] || upperBound) * 1000).toISOString() } : {}),
        }).eq('id', connection.id).eq('organization_id', connection.organization_id)
        if (error) throw new Error('GMAIL_CURSOR_WRITE_FAILED')
      }
      let completed = false
      let fetched = 0
      // Bound execution; persisted IDs let subsequent runs progress through the backlog.
      for (let page = 0; page < 20; page++) {
        const params = new URLSearchParams({ q: scanQuery, maxResults: '100' })
        if (pageToken) params.set('pageToken', pageToken)
        const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000),
        })
        if (!response.ok) throw new Error(`GMAIL_LIST_HTTP_${response.status}`)
        const pageData = await response.json() as { messages?: { id: string }[]; nextPageToken?: string }
        const messages = pageData.messages || []
        const ids = messages.map(({ id }) => `${connection.id}:${id}`)
        const known = ids.length ? await db.from('raw_emails').select('provider_message_id')
          .eq('organization_id', connection.organization_id).eq('provider', 'gmail').in('provider_message_id', ids)
          : { data: [], error: null }
        if (known.error) throw new Error('GMAIL_DEDUP_LOOKUP_FAILED')
        const existing = new Set((known.data || []).map(row => row.provider_message_id))
        let pageComplete = true
        for (const message of messages) {
          const providerId = `${connection.id}:${message.id}`
          if (existing.has(providerId)) { results.duplicates++; continue }
          if (fetched >= 100 || Date.now() >= deadline) { pageComplete = false; break }
          const emails = await fetchEmailsByIds(token, [message.id])
          const email = emails[0]
          if (!email) throw new Error('GMAIL_MESSAGE_FETCH_FAILED')
          fetched++; results.processed++
          const platform = platformFromSender(email.from)
          const accepted = platform && flag.pilot_platforms.includes(platform)
          const { error: persistError } = await db.from('raw_emails').upsert({
            organization_id: connection.organization_id, provider: 'gmail', provider_message_id: providerId,
            recipient: connection.email, sender: email.from, subject: email.subject,
            received_at: email.receivedAt.toISOString(), raw_content: `Subject: ${email.subject}\n\n${email.body}`,
            processing_status: accepted ? 'pending' : 'rejected', last_error: accepted ? null : 'SENDER_OR_PLATFORM_NOT_ENABLED',
          }, { onConflict: 'organization_id,provider,provider_message_id', ignoreDuplicates: true })
          if (persistError) throw new Error('GMAIL_STAGING_WRITE_FAILED')
          if (accepted) results.staged++; else results.skipped++
        }
        if (!pageComplete) break
        pageToken = pageData.nextPageToken
        await checkpoint(pageToken || null, !pageToken)
        if (!pageToken) { completed = true; break }
        if (fetched >= 100 || Date.now() >= deadline) break
      }
      if (!completed) throw new Error('GMAIL_BACKFILL_IN_PROGRESS')

    } catch (error) {
      results.errors++
      console.error('[GmailIngestion]', { organizationId: connection.organization_id,
        code: error instanceof Error && /^[A-Z_0-9]+$/.test(error.message) ? error.message : 'GMAIL_INGESTION_FAILED' })
    }
  }
  return results
}
