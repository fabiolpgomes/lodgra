const getUser = jest.fn()
const maybeSingle = jest.fn()
const insert = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({ auth: { getUser } })),
}))
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: (table: string) =>
      table === 'platform_admins'
        ? { select: () => ({ eq: () => ({ maybeSingle }) }) }
        : { insert },
  })),
}))

import { recordPlatformAudit, requirePlatformAdmin, resolvePlatformAdmin } from '../platform-admin'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('resolvePlatformAdmin', () => {
  it('sem sessão: unauthenticated e não consulta a tabela', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(resolvePlatformAdmin()).resolves.toEqual({ status: 'unauthenticated' })
    expect(maybeSingle).not.toHaveBeenCalled()
  })

  it('JWT inválido (erro do Auth): unauthenticated', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: { message: 'jwt expired' } })
    await expect(resolvePlatformAdmin()).resolves.toEqual({ status: 'unauthenticated' })
  })

  it('utilizador fora de platform_admins (ex.: admin de tenant): forbidden', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'tenant-admin' } }, error: null })
    maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(resolvePlatformAdmin()).resolves.toEqual({ status: 'forbidden' })
  })

  it('utilizador em platform_admins: ok', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'op' } }, error: null })
    maybeSingle.mockResolvedValue({ data: { user_id: 'op' }, error: null })
    await expect(resolvePlatformAdmin()).resolves.toEqual({ status: 'ok', userId: 'op' })
  })

  it('falha na consulta: error (falha fechada, nunca ok)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'op' } }, error: null })
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'db down' } })
    await expect(resolvePlatformAdmin()).resolves.toEqual({ status: 'error' })
  })

  it('não usa cache: revogar a linha corta o acesso no pedido seguinte', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'op' } }, error: null })
    maybeSingle.mockResolvedValueOnce({ data: { user_id: 'op' }, error: null })
    maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    expect((await resolvePlatformAdmin()).status).toBe('ok')
    expect((await resolvePlatformAdmin()).status).toBe('forbidden')
  })
})

describe('requirePlatformAdmin', () => {
  it.each([
    ['unauthenticated', 401],
    ['forbidden', 403],
    ['error', 503],
  ] as const)('%s -> HTTP %i', async (status, httpStatus) => {
    if (status === 'unauthenticated') getUser.mockResolvedValue({ data: { user: null }, error: null })
    else {
      getUser.mockResolvedValue({ data: { user: { id: 'u' } }, error: null })
      maybeSingle.mockResolvedValue(
        status === 'forbidden' ? { data: null, error: null } : { data: null, error: { message: 'x' } }
      )
    }
    const auth = await requirePlatformAdmin()
    expect(auth.authorized).toBe(false)
    expect(auth.response?.status).toBe(httpStatus)
  })

  it('operador autorizado devolve o userId', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'op' } }, error: null })
    maybeSingle.mockResolvedValue({ data: { user_id: 'op' }, error: null })
    await expect(requirePlatformAdmin()).resolves.toEqual({ authorized: true, userId: 'op' })
  })
})

describe('recordPlatformAudit', () => {
  it('grava ator, ação e alvo e devolve true', async () => {
    insert.mockResolvedValue({ error: null })
    await expect(recordPlatformAudit({ actorUserId: 'op', action: 'cron.run', target: '/api/cron/cleanup' })).resolves.toBe(true)
    expect(insert).toHaveBeenCalledWith({
      actor_user_id: 'op',
      action: 'cron.run',
      target: '/api/cron/cleanup',
      metadata: {},
    })
  })

  it('devolve false se a gravação falhar', async () => {
    insert.mockResolvedValue({ error: { message: 'insert failed' } })
    await expect(recordPlatformAudit({ actorUserId: 'op', action: 'cron.run' })).resolves.toBe(false)
  })
})
