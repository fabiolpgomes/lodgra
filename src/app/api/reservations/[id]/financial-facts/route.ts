import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateRequestId, logger } from '@/lib/logger'
import { putReservationFinancialFactsRequestSchema } from '@/lib/financial/payout-contract'
import { PAYOUT_RESPONSE_HEADERS, payoutErrorResponse, readJsonBody } from '@/lib/financial/payout-http'
import {
  getReservationFinancialFacts,
  replaceReservationFinancialFacts,
} from '@/lib/financial/reservation-financial-service.server'

const idSchema = z.string().uuid()
const ROUTE = '/api/reservations/[id]/financial-facts'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = generateRequestId()
  try {
    const { id } = await context.params
    const reservationId = idSchema.parse(id)
    const result = await getReservationFinancialFacts(await createClient(), reservationId, requestId)
    return NextResponse.json(result, { headers: PAYOUT_RESPONSE_HEADERS })
  } catch (error) {
    logger.warn('Reservation financial facts read rejected', { requestId, route: ROUTE })
    return payoutErrorResponse(error, requestId)
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = generateRequestId()
  try {
    const { id } = await context.params
    const reservationId = idSchema.parse(id)
    const input = putReservationFinancialFactsRequestSchema.parse(await readJsonBody(request))
    const result = await replaceReservationFinancialFacts(await createClient(), reservationId, input, requestId)
    return NextResponse.json(result, { headers: PAYOUT_RESPONSE_HEADERS })
  } catch (error) {
    logger.warn('Reservation financial facts write rejected', { requestId, route: ROUTE })
    return payoutErrorResponse(error, requestId)
  }
}
