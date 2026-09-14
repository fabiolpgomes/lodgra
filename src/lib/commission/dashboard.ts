import type { SupabaseClient } from '@supabase/supabase-js'
import { startOfMonth, startOfYear } from 'date-fns'
import { z } from 'zod'

const propertySchema = z.object({ name: z.string().nullable() })
const commissionSchema = z.object({
  id: z.string(), property_id: z.string().nullable(),
  commission_amount: z.number().finite(),
  commission_calculated_at: z.string().nullable(),
  properties: z.union([propertySchema, z.array(propertySchema)]).nullable(),
})
type Commission = z.infer<typeof commissionSchema>

/** Read through session RLS and tenant scope; do not depend on a stale materialized view. */
export async function loadCommissionDashboard(supabase: SupabaseClient, organizationId: string, now = new Date()) {
  const commissions: Commission[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('reservations')
      .select('id,property_id,commission_amount,commission_calculated_at,properties:properties!reservations_property_org_fk(name)')
      .eq('organization_id', organizationId)
      .not('status', 'in', '(cancelled,pending,pending_payment)')
      .not('commission_amount', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (error) throw new Error(`Commission read failed: ${error.code || 'database_error'}`)
    const page = z.array(commissionSchema).parse(data)
    commissions.push(...page)
    if (page.length < pageSize) break
  }

  // Preserve the existing date-fns/local-time boundary converted to a UTC date.
  const monthStart = startOfMonth(now).toISOString().split('T')[0]
  const yearStart = startOfYear(now).toISOString().split('T')[0]
  const summary = (rows: Commission[]) => {
    const total = rows.reduce((sum, row) => sum + row.commission_amount, 0)
    return { total, count: rows.length, avgPerBooking: rows.length ? total / rows.length : 0 }
  }
  const since = (date: string) => commissions.filter(row => row.commission_calculated_at !== null &&
    new Date(row.commission_calculated_at).toISOString().slice(0, 10) >= date)
  const properties = new Map<string | null, { id: string | null; name: string; total: number; count: number }>()
  for (const row of commissions) {
    const property = Array.isArray(row.properties) ? row.properties[0] : row.properties
    const entry = properties.get(row.property_id) ?? {
      id: row.property_id, name: property?.name || 'Unknown', total: 0, count: 0,
    }
    entry.total += row.commission_amount
    entry.count++
    properties.set(row.property_id, entry)
  }
  return {
    currentMonth: summary(since(monthStart)),
    yearToDate: summary(since(yearStart)),
    allTime: summary(commissions),
    byProperty: [...properties.values()].sort((a, b) => b.total - a.total),
  }
}
