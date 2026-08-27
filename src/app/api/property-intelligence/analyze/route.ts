import { randomUUID } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import {
  buildMarkdownReport,
  runPropertyIntelligenceAnalysis,
  type PropertyIntelligenceInput,
} from '@/lib/property-intelligence'
import {
  getPropertyIntelligenceGateMessage,
  isPropertyIntelligenceAnalysisEnabled,
} from '@/lib/property-intelligence/gate'

export async function POST(request: NextRequest) {
  if (!isPropertyIntelligenceAnalysisEnabled()) {
    return NextResponse.json(
      {
        error: {
          category: 'feature_disabled',
          traceId: randomUUID(),
          message: getPropertyIntelligenceGateMessage(),
        },
      },
      { status: 503 }
    )
  }

  const traceId = randomUUID()

  let input: PropertyIntelligenceInput
  try {
    input = await request.json()
  } catch {
    return NextResponse.json(
      {
        error: {
          category: 'invalid_json',
          traceId,
          message: 'O payload precisa ser JSON válido.',
        },
      },
      { status: 400 }
    )
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return NextResponse.json(
      {
        error: {
          category: 'invalid_payload',
          traceId,
          message: 'O payload da análise precisa ser um objeto JSON.',
        },
      },
      { status: 400 }
    )
  }

  try {
    const startedAt = new Date().toISOString()
    const result = runPropertyIntelligenceAnalysis(input, { traceId, startedAt })

    return NextResponse.json(
      {
        traceId: result.traceId,
        result,
        markdown: buildMarkdownReport(result),
      },
      {
        status: result.status === 'ready' ? 200 : 202,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha inesperada na análise.'
    console.error('[property-intelligence] analysis failed', { traceId, error })

    return NextResponse.json(
      {
        error: {
          category: 'analysis_error',
          traceId,
          message,
        },
      },
      { status: 500 }
    )
  }
}
