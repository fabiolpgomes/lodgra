const maybeSingle = jest.fn()
const eq = jest.fn()
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: (...a: unknown[]) => { eq(...a); return { eq: (...b: unknown[]) => { eq(...b); return { maybeSingle } } } } }) }),
  }),
}))

import { propertyBelongsToOrg } from '../property-access'

beforeEach(() => jest.clearAllMocks())

describe('propertyBelongsToOrg', () => {
  it('true quando a propriedade existe na organização (filtra por id e organization_id)', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'p1' }, error: null })
    expect(await propertyBelongsToOrg('p1', 'org-a')).toBe(true)
    expect(eq).toHaveBeenCalledWith('id', 'p1')
    expect(eq).toHaveBeenCalledWith('organization_id', 'org-a')
  })

  it('false quando é de outra organização (sem linha)', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })
    expect(await propertyBelongsToOrg('p1', 'org-b')).toBe(false)
  })

  it('false em erro de base de dados (falha fechada)', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'p1' }, error: { message: 'x' } })
    expect(await propertyBelongsToOrg('p1', 'org-a')).toBe(false)
  })

  it('false se o cliente lançar', async () => {
    maybeSingle.mockRejectedValue(new Error('boom'))
    expect(await propertyBelongsToOrg('p1', 'org-a')).toBe(false)
  })

  it.each([[undefined], [null], [''], [123]])('false para propertyId inválido (%p) sem consultar', async id => {
    expect(await propertyBelongsToOrg(id, 'org-a')).toBe(false)
    expect(maybeSingle).not.toHaveBeenCalled()
  })

  it('false sem organização', async () => {
    expect(await propertyBelongsToOrg('p1', null)).toBe(false)
    expect(maybeSingle).not.toHaveBeenCalled()
  })
})
