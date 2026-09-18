import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateRequestId, logger } from '@/lib/logger'
import {
  createPayoutRuleV2RequestSchema,
  replaceAnyPayoutRuleRequestSchema,
  replacePayoutRuleV2RequestSchema,
} from '@/lib/financial/payout-contract'
import {
  getPayoutRules,
  createPayoutRuleV2,
  replacePayoutRule,
  replacePayoutRuleV2,
} from '@/lib/financial/payout-service.server'
import {
  PAYOUT_RESPONSE_HEADERS,
  payoutErrorResponse,
  readJsonBody,
} from '@/lib/financial/payout-http'

const propertyIdSchema = z.string().uuid()
const ROUTE = '/api/properties/[id]/payout-rules'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId()
  const startedAt = Date.now()
  try {
    const { id } = await context.params
    const propertyId = propertyIdSchema.parse(id)
    const supabase = await createClient()
    const response = await getPayoutRules(supabase, propertyId, requestId)
    logger.info('Payout rules read completed', {
      requestId,
      route: ROUTE,
      organizationId: response.currentRule?.organizationId,
      propertyId,
      outcome: 'success',
      durationMs: Date.now() - startedAt,
    })
    return NextResponse.json(response, { headers: PAYOUT_RESPONSE_HEADERS })
  } catch (error) {
    logger.warn('Payout rules read rejected', { requestId, route: ROUTE, outcome: 'rejected', durationMs: Date.now() - startedAt })
    return payoutErrorResponse(error, requestId)
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId()
  const startedAt = Date.now()
  try {
    const { id } = await context.params
    const propertyId = propertyIdSchema.parse(id)
    const input = replaceAnyPayoutRuleRequestSchema.parse(await readJsonBody(request))
    const supabase = await createClient()
    let result
    if ('contractVersion' in input) {
      result = input.expectedCurrentRuleId === null
        ? await createPayoutRuleV2(supabase, propertyId, createPayoutRuleV2RequestSchema.parse(input))
        : await replacePayoutRuleV2(supabase, propertyId, replacePayoutRuleV2RequestSchema.parse(input))
    } else {
      result = await replacePayoutRule(supabase, propertyId, input)
    }
    const { context: authorized, previousRule, currentRule } = result
    logger.info('Payout rule replaced', {
      requestId,
      route: ROUTE,
      userId: authorized.userId,
      organizationId: authorized.organizationId,
      propertyId,
      outcome: 'success',
      durationMs: Date.now() - startedAt,
    })
    return NextResponse.json({ requestId, previousRule, currentRule }, { status: 201, headers: PAYOUT_RESPONSE_HEADERS })
  } catch (error) {
    logger.warn('Payout rule replacement rejected', { requestId, route: ROUTE, outcome: 'rejected', durationMs: Date.now() - startedAt })
    return payoutErrorResponse(error, requestId)
  }
}
