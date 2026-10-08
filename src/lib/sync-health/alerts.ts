/**
 * Active sync alerts. Pure: decides who is told what and when; alerts-run.ts does the I/O.
 * Each alertable problem is e-mailed once when it appears, then at most once a day while it lasts.
 */
import type { SyncAction } from './actions'

export const REMINDER_HOURS = 24
/** Cron runs every 15 min: a reminder due at 23h50 should not wait for the next day. */
const REMINDER_TOLERANCE_MS = 15 * 60_000

export interface AlertState {
  action_key: string
  dismissed_at: string | null
  first_notified_at: string | null
  last_notified_at: string | null
}

export interface AlertPlan {
  /** Send one digest now. */
  send: boolean
  /** Every alertable, non-dismissed action, new ones first. */
  items: Array<{ action: SyncAction; isNew: boolean }>
  /** Problems that are gone: their bookkeeping is cleared so a relapse alerts again at once. */
  resolvedKeys: string[]
}

export function planSyncAlerts(actions: SyncAction[], states: AlertState[], now: Date): AlertPlan {
  const byKey = new Map(states.map(state => [state.action_key, state]))
  const dueBefore = now.getTime() - REMINDER_HOURS * 3_600_000 + REMINDER_TOLERANCE_MS
  const items: AlertPlan['items'] = []
  let send = false

  for (const action of actions) {
    if (!action.alert) continue
    const state = byKey.get(action.key)
    if (state?.dismissed_at) continue
    const isNew = !state?.first_notified_at
    const due = isNew || !state?.last_notified_at || Date.parse(state.last_notified_at) <= dueBefore
    if (due) send = true
    items.push({ action, isNew })
  }
  items.sort((a, b) => Number(b.isNew) - Number(a.isNew))

  const current = new Set(actions.map(action => action.key))
  const resolvedKeys = states
    .filter(state => !state.dismissed_at && state.first_notified_at && !current.has(state.action_key))
    .map(state => state.action_key)

  return { send: send && items.length > 0, items, resolvedKeys }
}

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function absolute(href: string | null, external: boolean, appUrl: string, fallback: string): string {
  if (!href) return fallback
  if (external || /^https?:\/\//.test(href)) return href
  return `${appUrl}${href}`
}

export function renderSyncAlertEmail(plan: AlertPlan, options: { appUrl: string; locale: string; organizationName: string | null }) {
  const appUrl = options.appUrl.replace(/\/$/, '')
  const panelUrl = `${appUrl}/${options.locale}/sync`
  const stopped = plan.items.some(item => item.action.severity === 'stopped')
  const count = plan.items.length
  const headline = stopped ? 'Sincronização parada' : count === 1 ? '1 ação pendente' : `${count} ações pendentes`
  const subject = `Lodgra · ${headline}${options.organizationName ? ` · ${options.organizationName}` : ''}`

  const rows = plan.items.map(({ action, isNew }) => `
        <tr>
          <td style="padding:14px 0;border-top:1px solid #e5e7eb;">
            <div style="font-size:15px;font-weight:600;color:#111827;">${isNew ? '<span style="display:inline-block;margin-right:6px;padding:1px 6px;border-radius:4px;background:#eff6ff;color:#1d4ed8;font-size:11px;">NOVO</span>' : ''}${escapeHtml(action.title)}</div>
            <div style="margin-top:4px;font-size:14px;color:#4b5563;">${escapeHtml(action.detail)}</div>
            <a href="${escapeHtml(absolute(action.href, action.external, appUrl, panelUrl))}" style="display:inline-block;margin-top:8px;font-size:14px;color:#2563eb;font-weight:600;text-decoration:none;">${escapeHtml(action.cta)} →</a>
          </td>
        </tr>`).join('')

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
    <div style="padding:24px;border-radius:8px 8px 0 0;background:${stopped ? '#b91c1c' : '#b45309'};color:#fff;">
      <h1 style="margin:0;font-size:20px;">${escapeHtml(headline)}</h1>
      <p style="margin:8px 0 0;opacity:.9;">As reservas da Airbnb e da Booking só ficam completas no Lodgra depois disto.</p>
    </div>
    <div style="padding:8px 24px 24px;border:1px solid #e5e7eb;border-top:0;background:#fff;">
      <table style="width:100%;border-collapse:collapse;">${rows}
      </table>
      <a href="${escapeHtml(panelUrl)}" style="display:inline-block;margin-top:16px;padding:10px 16px;border-radius:6px;background:#2563eb;color:#fff;font-weight:600;text-decoration:none;">Abrir painel de sincronização</a>
      <p style="margin-top:20px;font-size:12px;color:#9ca3af;">Recebe este aviso uma vez quando o problema aparece e um lembrete por dia enquanto continuar. Para deixar de o receber, resolva a ação ou use "Ignorar" no painel.</p>
    </div>
  </div>`

  const text = [
    headline, '',
    ...plan.items.map(({ action, isNew }) => `${isNew ? '[NOVO] ' : ''}${action.title}\n${action.detail}\n${absolute(action.href, action.external, appUrl, panelUrl)}\n`),
    `Painel: ${panelUrl}`,
  ].join('\n')

  return { subject, html, text }
}
