import { NextRequest, NextResponse } from 'next/server'
import { RefundCalculator } from '@/lib/refunds/refund-calculator'

// Story 40.3: Estimate refund for UI display
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      policy_type,
      days_until_checkin,
      total_amount,
      stay_duration = 'short',
    } = body

    if (!policy_type || days_until_checkin === undefined || !total_amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = RefundCalculator.calculate({
      policy_type,
      stay_duration,
      days_until_checkin,
      during_stay: false,
      cancellation_reason: 'voluntary',
      total_amount,
    })

    return NextResponse.json({
      refund_amount: result.refund_amount,
      refund_percentage: result.refund_percentage,
      reason: result.reason,
    })
  } catch (error) {
    console.error('Error estimating refund:', error)
    return NextResponse.json(
      { error: 'Failed to estimate refund' },
      { status: 500 }
    )
  }
}
