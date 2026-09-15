import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { PayoutDataIncompleteError } from './payout-period'
import { PayoutServiceError } from './payout-service.server'

export const PAYOUT_RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const

const MAX_BODY_BYTES = 16 * 1024

export class PayoutTransportError extends Error {
  constructor(readonly status: 413 | 415 | 422, readonly code: string, message: string) {
    super(message)
  }
}

async function readBoundedText(request: Request): Promise<string> {
  const reader = request.body?.getReader?.()
  if (!reader) {
    const text = await request.text()
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      throw new PayoutTransportError(413, 'PAYLOAD_TOO_LARGE', 'O corpo da requisição excede 16 KiB')
    }
    return text
  }

  const decoder = new TextDecoder()
  let receivedBytes = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      receivedBytes += value.byteLength
      if (receivedBytes > MAX_BODY_BYTES) {
        throw new PayoutTransportError(413, 'PAYLOAD_TOO_LARGE', 'O corpo da requisição excede 16 KiB')
      }
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally {
    await reader.cancel().catch(() => undefined)
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') {
    throw new PayoutTransportError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Envie o corpo como application/json')
  }
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new PayoutTransportError(413, 'PAYLOAD_TOO_LARGE', 'O corpo da requisição excede 16 KiB')
  }
  const text = await readBoundedText(request)
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new PayoutTransportError(422, 'INVALID_JSON', 'O corpo JSON não é válido')
  }
}

export function payoutErrorResponse(error: unknown, requestId: string): NextResponse {
  if (error instanceof PayoutDataIncompleteError) {
    return NextResponse.json({
      error: { code: error.code, message: error.message, issues: error.issues },
      requestId,
    }, { status: 422, headers: PAYOUT_RESPONSE_HEADERS })
  }
  if (error instanceof PayoutServiceError || error instanceof PayoutTransportError) {
    return NextResponse.json({
      error: { code: error.code, message: error.message, ...(error instanceof PayoutServiceError && error.issues ? { issues: error.issues } : {}) },
      requestId,
    }, { status: error.status, headers: PAYOUT_RESPONSE_HEADERS })
  }
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Revise os campos informados',
        issues: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
      },
      requestId,
    }, { status: 422, headers: PAYOUT_RESPONSE_HEADERS })
  }
  return NextResponse.json({
    error: { code: 'INTERNAL_ERROR', message: 'Não foi possível concluir a operação' },
    requestId,
  }, { status: 500, headers: PAYOUT_RESPONSE_HEADERS })
}
