/**
 * /api/admin/cleaners — a rota estava aberta a qualquer pessoa e aceitava
 * organization_id/role do corpo do pedido. Estes testes travam o contrato:
 * só gestor/admin autenticado, organização sempre da sessão, role fixa.
 */
import { NextRequest, NextResponse } from 'next/server'

const requireRole = jest.fn()
const insert = jest.fn()
const orgSingle = jest.fn()

jest.mock('@/lib/auth/requireRole', () => ({ requireRole: (...a: unknown[]) => requireRole(...a) }))
jest.mock('@/lib/whatsapp/send-cleaner-notification', () => ({
  sendCleanerNotification: jest.fn().mockResolvedValue({ success: true }),
  CLEANER_MESSAGE_TEMPLATES: { welcome: () => 'welcome' },
}))
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(async () => ({
    from: (table: string) =>
      table === 'organizations'
        ? { select: () => ({ eq: () => ({ single: orgSingle }) }) }
        : {
            insert: (row: unknown) => {
              insert(row)
              return { select: () => ({ single: async () => ({ data: { id: 'c1' }, error: null }) }) }
            },
          },
  })),
}))

import { POST } from '../route'

const req = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest

const valid = { full_name: 'Ana', email: 'ana@x.com', phone_number: '+351912345678' }

beforeEach(() => {
  jest.clearAllMocks()
  orgSingle.mockResolvedValue({ data: { name: 'Org', metadata: {} } })
})

describe('POST /api/admin/cleaners', () => {
  it('devolve 401 sem sessão e não escreve nada', async () => {
    requireRole.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
    })
    const res = await POST(req(valid))
    expect(res.status).toBe(401)
    expect(insert).not.toHaveBeenCalled()
  })

  it('devolve 403 para role sem permissão', async () => {
    requireRole.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 }),
    })
    const res = await POST(req(valid))
    expect(res.status).toBe(403)
    expect(insert).not.toHaveBeenCalled()
  })

  it('devolve 403 quando o utilizador não tem organização', async () => {
    requireRole.mockResolvedValue({ authorized: true, userId: 'u1', role: 'admin' })
    const res = await POST(req(valid))
    expect(res.status).toBe(403)
    expect(insert).not.toHaveBeenCalled()
  })

  it('ignora organization_id/role/guest_type do corpo e usa os da sessão', async () => {
    requireRole.mockResolvedValue({ authorized: true, userId: 'u1', role: 'gestor', organizationId: 'org-A' })
    const res = await POST(
      req({ ...valid, organization_id: 'org-B', role: 'admin', guest_type: 'staff' })
    )
    expect(res.status).toBe(200)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 'org-A', role: 'guest', guest_type: 'cleaner' })
    )
  })

  it('rejeita telefone inválido com 400', async () => {
    requireRole.mockResolvedValue({ authorized: true, userId: 'u1', role: 'admin', organizationId: 'org-A' })
    const res = await POST(req({ ...valid, phone_number: 'abc' }))
    expect(res.status).toBe(400)
    expect(insert).not.toHaveBeenCalled()
  })
})
