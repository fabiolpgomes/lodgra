jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(async () => ({ marker: 'client' })) }))
jest.mock('@/lib/logger', () => ({
  generateRequestId: jest.fn(() => 'req_test'),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))
jest.mock('@/lib/financial/payout-service.server', () => {
  class PayoutServiceError extends Error {
    constructor(
      readonly status: number,
      readonly code: string,
      message: string,
      readonly issues?: unknown[],
    ) {
      super(message)
    }
  }
  return {
    PayoutServiceError,
    createPayoutRuleV2: jest.fn(),
    getPayoutRules: jest.fn(),
    replacePayoutRule: jest.fn(),
    replacePayoutRuleV2: jest.fn(),
    previewPayout: jest.fn(),
  }
})

import { GET, POST } from '../route'
import { POST as PREVIEW } from '../preview/route'
import { NextResponse } from 'next/server'
import {
  getPayoutRules,
  createPayoutRuleV2,
  PayoutServiceError,
  previewPayout,
  replacePayoutRule,
  replacePayoutRuleV2,
} from '@/lib/financial/payout-service.server'
import { PayoutDataIncompleteError } from '@/lib/financial/payout-period'

const propertyId = '6ea55539-02d4-4f8b-a0ef-984789d7504b'
const currentRule = {
  contractVersion: 1 as const,
  id: '9ce5220c-192d-4c9e-915c-99a641d82bac',
  organizationId: '2f58be8a-9f03-4b8a-aa30-d8428ed25c80',
  propriedadeId: propertyId,
  vigenciaInicio: '2026-01-01',
  vigenciaFim: null,
  tipoComissao: 'percentual',
  comissaoValor: '20.0000',
  baseComissao: 'faturamento_propriedade',
  taxaLimpezaPara: 'gestor',
  comissaoOtaPorConta: 'proprietario',
  despesasRepassaveis: true,
  diaFechamento: 1,
  observacoes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}
const ruleInput = {
  vigenciaInicio: '2026-09-01',
  tipoComissao: 'percentual',
  comissaoValor: '18.5',
  baseComissao: 'receita_bruta',
  taxaLimpezaPara: 'gestor',
  comissaoOtaPorConta: 'proprietario',
  despesasRepassaveis: true,
  diaFechamento: 5,
  observacoes: null,
}

function context(id = propertyId) {
  return { params: Promise.resolve({ id }) }
}

function jsonRequest(body: unknown, contentType = 'application/json') {
  return new Request(`http://localhost/api/properties/${propertyId}/payout-rules`, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body: JSON.stringify(body),
  })
}

describe('property payout rule route contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(NextResponse.json as jest.Mock).mockImplementation((body, init) => ({
      status: init?.status ?? 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
      headers: new Map(Object.entries(init?.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])),
    }))
  })

  it('returns authorized current/history data without public caching', async () => {
    ;(getPayoutRules as jest.Mock).mockResolvedValue({
      requestId: 'req_test',
      property: { id: propertyId, name: 'Casa', currency: 'EUR' },
      currentRule,
      history: [currentRule],
    })
    const response = await GET(new Request('http://localhost'), context())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toEqual(expect.objectContaining({
      currentRule,
      history: [currentRule],
    }))
  })

  it('returns an empty current rule for an authorized property awaiting its first contract', async () => {
    ;(getPayoutRules as jest.Mock).mockResolvedValue({
      requestId: 'req_test',
      property: { id: propertyId, name: 'Casa', currency: 'EUR' },
      defaults: null,
      currentRule: null,
      history: [],
    })
    const response = await GET(new Request('http://localhost'), context())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(expect.objectContaining({ currentRule: null, history: [] }))
  })

  it('uses the same sanitized 404 for inaccessible properties', async () => {
    ;(getPayoutRules as jest.Mock).mockRejectedValue(new PayoutServiceError(404, 'PROPERTY_NOT_FOUND', 'Propriedade não encontrada'))
    const response = await GET(new Request('http://localhost'), context())
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: { code: 'PROPERTY_NOT_FOUND', message: 'Propriedade não encontrada' },
      requestId: 'req_test',
    })
  })

  it('rejects invalid ids and untrusted tenant fields', async () => {
    const invalidIdResponse = await GET(new Request('http://localhost'), context('not-an-id'))
    expect(invalidIdResponse.status).toBe(422)
    const response = await POST(jsonRequest({
      ...ruleInput,
      expectedCurrentRuleId: currentRule.id,
      organizationId: currentRule.organizationId,
    }), context())
    expect(response.status).toBe(422)
    expect(replacePayoutRule).not.toHaveBeenCalled()
  })

  it('requires JSON and propagates role denial', async () => {
    expect((await POST(jsonRequest({}, 'text/plain'), context())).status).toBe(415)
    ;(replacePayoutRule as jest.Mock).mockRejectedValue(new PayoutServiceError(403, 'FORBIDDEN', 'Você não tem permissão para esta operação'))
    const response = await POST(jsonRequest({ ...ruleInput, expectedCurrentRuleId: currentRule.id }), context())
    expect(response.status).toBe(403)
  })

  it('rejects an oversized streamed body without relying on content-length', async () => {
    const request = new Request(`http://localhost/api/properties/${propertyId}/payout-rules`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(17 * 1024) }),
    })
    expect(request.headers.get('content-length')).toBeFalsy()
    expect((await POST(request, context())).status).toBe(413)
    expect(replacePayoutRule).not.toHaveBeenCalled()
  })

  it('returns both versions after atomic replacement', async () => {
    const nextRule = { ...currentRule, id: 'b22a4ee6-af84-46ce-9949-a770da221c3d', vigenciaInicio: '2026-09-01' }
    ;(replacePayoutRule as jest.Mock).mockResolvedValue({
      context: { userId: 'user', organizationId: currentRule.organizationId },
      previousRule: { ...currentRule, vigenciaFim: '2026-08-31' },
      currentRule: nextRule,
    })
    const response = await POST(jsonRequest({ ...ruleInput, expectedCurrentRuleId: currentRule.id }), context())
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(expect.objectContaining({
      requestId: 'req_test',
      previousRule: { ...currentRule, vigenciaFim: '2026-08-31' },
      currentRule: nextRule,
    }))
  })

  it('routes a complete v2 policy to the transactional v2 service', async () => {
    const components = [
      'accommodation', 'cleaning_fee', 'municipal_tax', 'other_guest_fees',
      'discount', 'ota_commission', 'payment_processing_fee',
    ].map(componente => ({
      componente,
      destinatario: 'owner',
      efeitoNaBaseComissao: 'credit',
      efeitoNoExtratoProprietario: 'credit',
    }))
    const input = {
      contractVersion: 2,
      expectedCurrentRuleId: currentRule.id,
      vigenciaInicio: '2026-09-01',
      tipoComissao: 'percentual',
      comissaoValor: '20',
      impostoComissaoPercentual: '23',
      competenciaReceita: 'check_out',
      fluxoFinanceiro: 'manager_trust',
      preset: 'custom',
      despesasRepassaveis: true,
      diaFechamento: 5,
      observacoes: null,
      componentes: components,
    }
    ;(replacePayoutRuleV2 as jest.Mock).mockResolvedValue({
      context: { userId: 'user', organizationId: currentRule.organizationId },
      previousRule: currentRule,
      currentRule: { ...currentRule, contractVersion: 2 },
    })
    const response = await POST(jsonRequest(input), context())
    expect(response.status).toBe(201)
    expect(replacePayoutRuleV2).toHaveBeenCalledWith({ marker: 'client' }, propertyId, input)
    expect(replacePayoutRule).not.toHaveBeenCalled()
  })

  it('routes explicit expected absence to initial v2 creation', async () => {
    const components = [
      'accommodation', 'cleaning_fee', 'municipal_tax', 'other_guest_fees',
      'discount', 'ota_commission', 'payment_processing_fee',
    ].map(componente => ({
      componente,
      destinatario: 'owner',
      efeitoNaBaseComissao: 'credit',
      efeitoNoExtratoProprietario: 'credit',
    }))
    const input = {
      contractVersion: 2,
      expectedCurrentRuleId: null,
      vigenciaInicio: '2026-09-01',
      tipoComissao: 'percentual',
      comissaoValor: '20',
      impostoComissaoPercentual: '0',
      competenciaReceita: 'check_out',
      fluxoFinanceiro: 'manager_trust',
      preset: 'custom',
      despesasRepassaveis: true,
      diaFechamento: 5,
      observacoes: null,
      componentes: components,
    }
    ;(createPayoutRuleV2 as jest.Mock).mockResolvedValue({
      context: { userId: 'user', organizationId: currentRule.organizationId },
      previousRule: null,
      currentRule: { ...currentRule, contractVersion: 2 },
    })
    const response = await POST(jsonRequest(input), context())
    expect(response.status).toBe(201)
    expect(createPayoutRuleV2).toHaveBeenCalledWith({ marker: 'client' }, propertyId, input)
    expect(replacePayoutRuleV2).not.toHaveBeenCalled()
    expect(replacePayoutRule).not.toHaveBeenCalled()
  })

  it('returns PAYOUT_DATA_INCOMPLETE without a partial result', async () => {
    ;(previewPayout as jest.Mock).mockRejectedValue(new PayoutDataIncompleteError([{
      code: 'MISSING_CLEANING_FEE_BREAKDOWN', entityType: 'reservation', entityId: 'reservation-1',
    }]))
    const response = await PREVIEW(jsonRequest({ mode: 'persisted', periodo: '2026-08', ruleId: currentRule.id }), context())
    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.error.code).toBe('PAYOUT_DATA_INCOMPLETE')
    expect(body.result).toBeUndefined()
  })
})
