import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { syncSubscriptionQuantity } from '@/lib/billing/stripe-usage'

export const dynamic = 'force-dynamic'

// POST /api/stripe/sync-quantity
// Syncs the Stripe subscription quantity to match the current number of active properties.
// Called after a property is added or removed.
export async function POST() {
  const auth = await requireRole(['admin'])
  if (!auth.authorized || !auth.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await syncSubscriptionQuantity(auth.organizationId)

  return NextResponse.json(result)
}
