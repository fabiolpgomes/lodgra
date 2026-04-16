import { getPlanLimits } from './plans'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { NextResponse } from 'next/server'

export async function requirePlanFeature(
  feature: 'ownerReports' | 'fiscalCompliance'
): Promise<{ authorized: false; response: NextResponse } | { authorized: true }> {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return { authorized: false, response: auth.response! }

  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_plan')
    .eq('id', auth.organizationId)
    .single()

  const limits = getPlanLimits(org?.subscription_plan)

  if (!limits[feature]) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'plan_upgrade_required', plan: 'professional' },
        { status: 403 }
      ),
    }
  }
  return { authorized: true }
}
