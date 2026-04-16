import { decryptToken, encryptToken } from './crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

interface EmailMessage {
  id: string
  threadId: string
  from: string
  subject: string
  body: string
  receivedAt: Date
}

interface ConnectionRow {
  id: string
  organization_id: string
  email: string
  access_token: string
  refresh_token: string
  token_expiry: string
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()
  if (!res.ok || !data.access_token) return null
  return data as { access_token: string; expires_in: number }
}

export async function getValidAccessToken(connection: ConnectionRow): Promise<string | null> {
  const supabase = createAdminClient()
  const expiry = new Date(connection.token_expiry)
  const now = new Date()

  // Token ainda válido (com margem de 5 min)
  if (expiry.getTime() - now.getTime() > 5 * 60 * 1000) {
    return decryptToken(connection.access_token)
  }

  // Token expirado — fazer refresh
  const refreshToken = decryptToken(connection.refresh_token)
  const refreshed = await refreshAccessToken(refreshToken)

  if (!refreshed) {
    console.error(`[gmail-client] Falha ao renovar token para org ${connection.organization_id}`)
    return null
  }

  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000)
  const encryptedNew = encryptToken(refreshed.access_token)

  await supabase
    .from('email_connections')
    .update({
      access_token: encryptedNew,
      token_expiry: newExpiry.toISOString(),
      last_sync_at: now.toISOString(),
    })
    .eq('id', connection.id)

  return refreshed.access_token
}

export async function fetchUnreadEmails(
  accessToken: string,
  senders: string[],
  daysBack = 30,
): Promise<EmailMessage[]> {
  const fromQuery = senders.map(s => `from:${s}`).join(' OR ')
  // O email_parse_log controla quais foram processados — não precisamos de is:unread
  const query = `(${fromQuery}) newer_than:${daysBack}d`

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!listRes.ok) {
    const err = await listRes.text()
    throw new Error(`Gmail API list error: ${err}`)
  }

  const listData = await listRes.json()
  const messages: { id: string }[] = listData.messages || []

  const emails: EmailMessage[] = []

  for (const msg of messages) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!msgRes.ok) continue

    const msgData = await msgRes.json()
    const headers: { name: string; value: string }[] = msgData.payload?.headers || []

    const from = headers.find(h => h.name === 'From')?.value || ''
    const subject = headers.find(h => h.name === 'Subject')?.value || ''
    const dateStr = headers.find(h => h.name === 'Date')?.value || ''

    const body = extractBody(msgData.payload)

    emails.push({
      id: msg.id,
      threadId: msgData.threadId,
      from,
      subject,
      body,
      receivedAt: dateStr ? new Date(dateStr) : new Date(),
    })
  }

  return emails
}

function extractBody(payload: Record<string, unknown>): string {
  if (!payload) return ''

  const parts = payload.parts as Record<string, unknown>[] | undefined
  const mimeType = payload.mimeType as string | undefined
  const body = payload.body as { data?: string } | undefined

  // Texto simples directo
  if (mimeType === 'text/plain' && body?.data) {
    return Buffer.from(body.data, 'base64').toString('utf8')
  }

  // HTML directo
  if (mimeType === 'text/html' && body?.data) {
    return Buffer.from(body.data, 'base64').toString('utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  // Multipart — procurar text/plain primeiro
  if (parts) {
    for (const part of parts) {
      const result = extractBody(part)
      if (result) return result
    }
  }

  return ''
}

/** Busca mensagens específicas do Gmail por ID (sem filtro de data) */
export async function fetchEmailsByIds(
  accessToken: string,
  messageIds: string[],
): Promise<EmailMessage[]> {
  const emails: EmailMessage[] = []

  for (const id of messageIds) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!msgRes.ok) continue

    const msgData = await msgRes.json()
    const headers: { name: string; value: string }[] = msgData.payload?.headers || []

    const from = headers.find(h => h.name === 'From')?.value || ''
    const subject = headers.find(h => h.name === 'Subject')?.value || ''
    const dateStr = headers.find(h => h.name === 'Date')?.value || ''
    const body = extractBody(msgData.payload)

    emails.push({
      id,
      threadId: msgData.threadId,
      from,
      subject,
      body,
      receivedAt: dateStr ? new Date(dateStr) : new Date(),
    })
  }

  return emails
}

export type { EmailMessage, ConnectionRow }
