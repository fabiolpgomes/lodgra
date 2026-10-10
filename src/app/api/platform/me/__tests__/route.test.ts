const resolvePlatformAdmin = jest.fn()
jest.mock('@/lib/auth/platform-admin', () => ({ resolvePlatformAdmin: (...a: unknown[]) => resolvePlatformAdmin(...a) }))

import { GET } from '../route'

describe('GET /api/platform/me', () => {
  it.each([
    [{ status: 'ok', userId: 'op' }, 200, { isPlatformAdmin: true }],
    [{ status: 'forbidden' }, 200, { isPlatformAdmin: false }],
    [{ status: 'unauthenticated' }, 401, { error: 'Não autenticado' }],
    [{ status: 'error' }, 503, { error: 'Serviço indisponível' }],
  ])('%j -> %i', async (resolution, status, body) => {
    resolvePlatformAdmin.mockResolvedValue(resolution)
    const res = await GET()
    expect(res.status).toBe(status)
    await expect(res.json()).resolves.toEqual(body)
  })
})
