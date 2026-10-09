jest.mock('@/lib/auth/requireRole', () => ({ requireRole: jest.fn() }))
const upsert = jest.fn()
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(async () => ({ from: () => ({ upsert }) })),
}))

import { PUT } from '../route'
import { requireRole } from '@/lib/auth/requireRole'

const request = (body: unknown) => ({ json: async () => body }) as never
const valid = { preset: 'net_received', competenciaReceita: 'check_out', fluxoFinanceiro: 'manager_trust', destinatarioLimpeza: 'manager' }

describe('PUT /api/organization/financial-defaults', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, organizationId: 'org-1' })
    upsert.mockResolvedValue({ error: null })
  })

  it('exige role admin', async () => {
    await PUT(request(valid))
    expect(requireRole).toHaveBeenCalledWith(['admin'])
  })

  it('grava na organização da sessão, com destinatário municipal fixo', async () => {
    const response = await PUT(request(valid))
    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalledWith({
      organization_id: 'org-1',
      default_preset: 'net_received',
      default_recognition_basis: 'check_out',
      default_cash_flow_model: 'manager_trust',
      default_cleaning_recipient: 'manager',
      default_municipal_tax_recipient: 'municipality',
    }, { onConflict: 'organization_id' })
  })

  it('ignora organization_id vindo do cliente (campo desconhecido é rejeitado)', async () => {
    const response = await PUT(request({ ...valid, organization_id: 'outra-org' }))
    expect(response.status).toBe(400)
    expect(upsert).not.toHaveBeenCalled()
  })

  it.each([
    { ...valid, preset: 'custom' },
    { ...valid, fluxoFinanceiro: 'x' },
    { ...valid, destinatarioLimpeza: 'municipality' },
    {},
  ])('rejeita valores inválidos %#', async body => {
    const response = await PUT(request(body))
    expect(response.status).toBe(400)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('devolve 500 sem expor o erro da base', async () => {
    upsert.mockResolvedValue({ error: { message: 'segredo interno' } })
    const response = await PUT(request(valid))
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('segredo')
  })
})
