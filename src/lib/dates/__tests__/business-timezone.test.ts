jest.mock('server-only', () => ({}))
const maybeSingle = jest.fn()
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}))

import { getOrganizationTimeZone } from '../business-timezone.server'

describe('getOrganizationTimeZone', () => {
  beforeEach(() => maybeSingle.mockReset())

  it('devolve o fuso da organização', async () => {
    maybeSingle.mockResolvedValue({ data: { timezone: 'America/Sao_Paulo' } })
    await expect(getOrganizationTimeZone('org-br')).resolves.toBe('America/Sao_Paulo')
  })

  it('usa o fuso por omissão se faltar, for inválido ou não houver organização', async () => {
    maybeSingle.mockResolvedValue({ data: { timezone: null } })
    await expect(getOrganizationTimeZone('org-x')).resolves.toBe('Europe/Lisbon')
    maybeSingle.mockResolvedValue({ data: { timezone: 'Not/AZone' } })
    await expect(getOrganizationTimeZone('org-y')).resolves.toBe('Europe/Lisbon')
    await expect(getOrganizationTimeZone(null)).resolves.toBe('Europe/Lisbon')
  })
})
