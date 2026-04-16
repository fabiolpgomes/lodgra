import { createAdminClient } from './supabase/admin'

export type AuditAction = 'create' | 'update' | 'delete'
export type AuditResource = 'user' | 'reservation' | 'expense' | 'owner' | 'property' | 'notification' | 'cron'

interface AuditEntry {
  userId: string
  action: AuditAction
  resourceType: AuditResource
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}

/**
 * Writes an entry to the audit_logs table.
 * Never throws — audit failures must not block the main operation.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('audit_logs').insert({
      user_id: entry.userId,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId ?? null,
      details: entry.details ?? null,
      ip_address: entry.ipAddress ?? null,
    })
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err)
  }
}
