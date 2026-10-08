import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadSyncHealth } from '@/lib/sync-health/load'
import { propertySyncStatus } from '@/lib/sync-health/actions'

const TONE: Record<string, string> = {
  ok: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  attention: 'bg-amber-50 text-amber-800 border-amber-200',
  failing: 'bg-red-50 text-red-800 border-red-200',
}
const DOT: Record<string, string> = { ok: 'bg-emerald-500', attention: 'bg-amber-500', failing: 'bg-red-600' }

/** Sync state of one property, linked to the panel. Renders nothing when the state cannot be read. */
export async function PropertySyncBadge({ organizationId, propertyId, locale }: { organizationId: string; propertyId: string; locale: string }) {
  let status
  try {
    status = propertySyncStatus(await loadSyncHealth(createAdminClient(), organizationId, locale), propertyId)
  } catch {
    return null
  }
  return (
    <Link
      href={`/${locale}/sync`}
      title="Ver no painel de sincronização"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE[status.tone]}`}
    >
      <span className={`h-2 w-2 rounded-full ${DOT[status.tone]}`} />
      {status.label}
    </Link>
  )
}
