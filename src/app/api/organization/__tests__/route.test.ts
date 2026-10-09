jest.mock('@/lib/auth/requireRole', () => ({ requireRole: jest.fn() }))
const update = jest.fn()
const eq = jest.fn()
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(async () => ({ from: () => ({ update: (data: unknown) => { update(data); return { eq } } }) })),
}))

import { PATCH } from '../route'
import { requireRole } from '@/lib/auth/requireRole'

const request = (body: unknown) => ({ json: async () => body }) as never

describe('PATCH /api/organization — região e moeda', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, organizationId: 'org-1' })
    eq.mockResolvedValue({ error: null })
  })

  it('grava fuso e moeda válidos', async () => {
    const response = await PATCH(request({ timezone: 'America/Sao_Paulo', currency: 'BRL' }))
    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ timezone: 'America/Sao_Paulo', currency: 'BRL' }))
    expect(eq).toHaveBeenCalledWith('id', 'org-1')
  })

  it('rejeita fuso fora da lista sem tocar na base', async () => {
    const response = await PATCH(request({ timezone: 'Mars/Olympus' }))
    expect(response.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejeita moeda fora da lista', async () => {
    const response = await PATCH(request({ currency: 'USD' }))
    expect(response.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it('sem campos válidos devolve 400', async () => {
    const response = await PATCH(request({}))
    expect(response.status).toBe(400)
  })
})
