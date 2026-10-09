jest.mock('@/lib/auth/requireRole', () => ({ requireRole: jest.fn() }))
const saveAsaasCredentials = jest.fn()
const getAsaasSettingsView = jest.fn()
jest.mock('@/lib/payments/asaas-credentials.server', () => ({
  saveAsaasCredentials: (...args: unknown[]) => saveAsaasCredentials(...args),
  getAsaasSettingsView: (...args: unknown[]) => getAsaasSettingsView(...args),
}))

import { GET, PUT } from '../route'
import { requireRole } from '@/lib/auth/requireRole'
import { NextResponse } from 'next/server'

const request = (body: unknown) => ({ json: async () => body }) as never
const view = { configured: true, environment: 'sandbox', keyLast4: '1234', webhookToken: 'tok' }

describe('/api/organization/payment-settings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(NextResponse.json as jest.Mock).mockImplementation((body, init) => ({
      status: init?.status ?? 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
      headers: new Map(Object.entries(init?.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])),
    }))
    ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, organizationId: 'org-1' })
    getAsaasSettingsView.mockResolvedValue(view)
    saveAsaasCredentials.mockResolvedValue(undefined)
  })

  it('só admin: exige role admin no GET e no PUT', async () => {
    await GET()
    await PUT(request({ environment: 'sandbox' }))
    expect(requireRole).toHaveBeenNthCalledWith(1, ['admin'])
    expect(requireRole).toHaveBeenNthCalledWith(2, ['admin'])
  })

  it('GET devolve o estado sem a chave completa, sem cache', async () => {
    const response = await GET()
    expect(await response.json()).toEqual(view)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(getAsaasSettingsView).toHaveBeenCalledWith('org-1')
  })

  it('PUT grava na organização da sessão e não devolve a chave', async () => {
    const response = await PUT(request({ environment: 'production', apiKey: '$aak_secret_123456' }))
    expect(response.status).toBe(200)
    expect(saveAsaasCredentials).toHaveBeenCalledWith('org-1', { environment: 'production', apiKey: '$aak_secret_123456' })
    expect(JSON.stringify(await response.json())).not.toContain('secret')
  })

  it('PUT sem chave mantém a atual (apiKey omitida)', async () => {
    await PUT(request({ environment: 'sandbox' }))
    expect(saveAsaasCredentials).toHaveBeenCalledWith('org-1', { environment: 'sandbox' })
  })

  it.each([
    { environment: 'live' },
    { environment: 'sandbox', apiKey: 'curta' },
    { environment: 'sandbox', organization_id: 'outra' },
    {},
  ])('rejeita corpo inválido %#', async body => {
    const response = await PUT(request(body))
    expect(response.status).toBe(400)
    expect(saveAsaasCredentials).not.toHaveBeenCalled()
  })

  it('erro interno não vaza detalhes', async () => {
    saveAsaasCredentials.mockRejectedValue(new Error('segredo interno'))
    const response = await PUT(request({ environment: 'sandbox' }))
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('segredo')
  })
})
