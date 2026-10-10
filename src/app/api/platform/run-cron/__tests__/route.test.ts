import { NextResponse } from 'next/server'

const requirePlatformAdmin = jest.fn()
const recordPlatformAudit = jest.fn()
const fetchMock = jest.fn()

jest.mock('@/lib/auth/platform-admin', () => ({
  requirePlatformAdmin: (...a: unknown[]) => requirePlatformAdmin(...a),
  recordPlatformAudit: (...a: unknown[]) => recordPlatformAudit(...a),
}))

import { POST } from '../route'

const request = (body: unknown) =>
  ({ json: async () => body, nextUrl: { origin: 'https://app.test' } }) as never

const denied = (status: number) => ({
  authorized: false,
  response: NextResponse.json({ error: 'x' }, { status }),
})

beforeEach(() => {
  jest.clearAllMocks()
  process.env.CRON_SECRET = 'segredo-de-teste'
  global.fetch = fetchMock as unknown as typeof fetch
  requirePlatformAdmin.mockResolvedValue({ authorized: true, userId: 'op' })
  recordPlatformAudit.mockResolvedValue(true)
  fetchMock.mockResolvedValue({ status: 200, json: async () => ({ ok: true }) })
})

describe('POST /api/platform/run-cron', () => {
  it.each([401, 403, 503])('sem acesso de plataforma (%i): não audita nem executa', async status => {
    requirePlatformAdmin.mockResolvedValue(denied(status))
    const res = await POST(request({ path: '/api/cron/cleanup' }))
    expect(res.status).toBe(status)
    expect(recordPlatformAudit).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejeita path fora da lista com 400', async () => {
    const res = await POST(request({ path: '/api/admin/qualquer-coisa' }))
    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejeita corpo inválido com 400 (sem lançar)', async () => {
    const res = await POST({ json: async () => { throw new Error('bad json') }, nextUrl: { origin: 'x' } } as never)
    expect(res.status).toBe(400)
  })

  it('sem CRON_SECRET: 500 e nada executa', async () => {
    delete process.env.CRON_SECRET
    const res = await POST(request({ path: '/api/cron/cleanup' }))
    expect(res.status).toBe(500)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('se a auditoria falhar, a ação não corre (503)', async () => {
    recordPlatformAudit.mockResolvedValue(false)
    const res = await POST(request({ path: '/api/cron/cleanup' }))
    expect(res.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('operador: audita com o ator e executa com Bearer', async () => {
    const res = await POST(request({ path: '/api/cron/cleanup' }))
    expect(res.status).toBe(200)
    expect(recordPlatformAudit).toHaveBeenCalledWith({
      actorUserId: 'op',
      action: 'cron.run',
      target: '/api/cron/cleanup',
    })
    expect(fetchMock).toHaveBeenCalledWith('https://app.test/api/cron/cleanup', {
      method: 'GET',
      headers: { Authorization: 'Bearer segredo-de-teste' },
    })
  })

  it('o segredo nunca vai para a auditoria', async () => {
    await POST(request({ path: '/api/cron/cleanup' }))
    expect(JSON.stringify(recordPlatformAudit.mock.calls)).not.toContain('segredo-de-teste')
  })

  it('cron devolve resposta não-JSON: repassa o status com erro legível', async () => {
    fetchMock.mockResolvedValue({ status: 500, json: async () => { throw new Error('html') } })
    const res = await POST(request({ path: '/api/cron/sync-ical' }))
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'Resposta inválida do cron' })
  })

  it('falha de rede ao chamar o cron: 502', async () => {
    fetchMock.mockRejectedValue(new Error('network'))
    const res = await POST(request({ path: '/api/cron/sync-ical' }))
    expect(res.status).toBe(502)
  })
})
