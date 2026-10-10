import { NextResponse } from 'next/server'

const requirePlatformAdmin = jest.fn()
const recordPlatformAudit = jest.fn()
const listUsers = jest.fn()
const deleteUser = jest.fn()
const selectProfiles = jest.fn()

jest.mock('@/lib/auth/platform-admin', () => ({
  requirePlatformAdmin: (...a: unknown[]) => requirePlatformAdmin(...a),
  recordPlatformAudit: (...a: unknown[]) => recordPlatformAudit(...a),
}))
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { listUsers: (...a: unknown[]) => listUsers(...a), deleteUser: (...a: unknown[]) => deleteUser(...a) } },
    from: () => ({ select: (...a: unknown[]) => selectProfiles(...a) }),
  }),
}))

import { POST, ORPHAN_GRACE_MS } from '../route'

const request = (action?: string) =>
  ({ nextUrl: { searchParams: new URLSearchParams(action ? { action } : {}) } }) as never

const old = new Date(Date.now() - ORPHAN_GRACE_MS - 60_000).toISOString()
const recent = new Date(Date.now() - 60_000).toISOString()

beforeEach(() => {
  jest.clearAllMocks()
  requirePlatformAdmin.mockResolvedValue({ authorized: true, userId: 'op' })
  recordPlatformAudit.mockResolvedValue(true)
  selectProfiles.mockResolvedValue({ data: [{ id: 'has-profile' }], error: null })
  listUsers.mockResolvedValue({
    data: {
      users: [
        { id: 'has-profile', email: 'a@x.com', created_at: old },
        { id: 'orphan-old', email: 'b@x.com', created_at: old },
        { id: 'orphan-recent', email: 'c@x.com', created_at: recent },
      ],
    },
    error: null,
  })
  deleteUser.mockResolvedValue({ error: null })
})

describe('POST /api/platform/orphaned-users', () => {
  it.each([401, 403, 503])('sem acesso de plataforma (%i): não toca em nada', async status => {
    requirePlatformAdmin.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'x' }, { status }),
    })
    const res = await POST(request('delete'))
    expect(res.status).toBe(status)
    expect(listUsers).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('action inválida: 400', async () => {
    expect((await POST(request('drop'))).status).toBe(400)
  })

  it('list: devolve só órfãos fora da margem de registo e não apaga', async () => {
    const body = await (await POST(request())).json()
    expect(body.orphaned_users).toEqual([{ id: 'orphan-old', email: 'b@x.com' }])
    expect(deleteUser).not.toHaveBeenCalled()
    expect(recordPlatformAudit).not.toHaveBeenCalled()
  })

  it('delete: audita antes e apaga apenas o órfão antigo', async () => {
    const res = await POST(request('delete'))
    expect(res.status).toBe(200)
    expect(recordPlatformAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: 'op', action: 'orphaned_users.delete' })
    )
    expect(deleteUser).toHaveBeenCalledTimes(1)
    expect(deleteUser).toHaveBeenCalledWith('orphan-old')
  })

  it('delete: se a auditoria falhar, nada é apagado (503)', async () => {
    recordPlatformAudit.mockResolvedValue(false)
    const res = await POST(request('delete'))
    expect(res.status).toBe(503)
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('delete: falha parcial é reportada sem abortar o resto', async () => {
    listUsers.mockResolvedValue({
      data: { users: [
        { id: 'o1', email: '1@x.com', created_at: old },
        { id: 'o2', email: '2@x.com', created_at: old },
      ] },
      error: null,
    })
    deleteUser.mockResolvedValueOnce({ error: { message: 'boom' } }).mockResolvedValueOnce({ error: null })
    const body = await (await POST(request('delete'))).json()
    expect(body.deleted_count).toBe(1)
    expect(body.errors).toEqual([{ id: 'o1', error: 'boom' }])
  })
})
