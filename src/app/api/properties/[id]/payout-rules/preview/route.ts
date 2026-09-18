import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateRequestId, logger } from '@/lib/logger'
import { previewPayoutRequestSchema } from '@/lib/financial/payout-contract'
import { previewPayout } from '@/lib/financial/payout-service.server'
import { PAYOUT_RESPONSE_HEADERS, payoutErrorResponse, readJsonBody } from '@/lib/financial/payout-http'

const propertyIdSchema = z.string().uuid()
const ROUTE = '/api/properties/[id]/payout-rules/preview'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId()
  const startedAt = Date.now()
  let mode: 'persisted' | 'simulation' | undefined
  try {
    const { id } = await context.params
    const propertyId = propertyIdSchema.parse(id)
    const input = previewPayoutRequestSchema.parse(await readJsonBody(request))
    mode = input.mode
    const supabase = await createClient()
    const { context: authorized, response } = await previewPayout(supabase, propertyId, input, requestId)
    logger.info('Payout preview completed', {
      requestId,
      route: ROUTE,
      userId: authorized.userId,
      organizationId: authorized.organizationId,
      propertyId,
      mode,
      outcome: 'success',
      durationMs: Date.now() - startedAt,
    })
    return NextResponse.json(response, { headers: PAYOUT_RESPONSE_HEADERS })
  } catch (error) {
    logger.warn('Payout preview rejected', {
      requestId,
      route: ROUTE,
      mode,
      outcome: 'rejected',
      durationMs: Date.now() - startedAt,
    })
    return payoutErrorResponse(error, requestId)
  }
}
