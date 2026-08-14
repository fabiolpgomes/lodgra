import { hasFullOperationalAccess, isRestrictedGestor } from '@/lib/auth/permissions'

describe('operational role permissions', () => {
  it('grants a gestor with all-property access full operational permissions', () => {
    const profile = { role: 'gestor', access_all_properties: true }

    expect(hasFullOperationalAccess(profile)).toBe(true)
    expect(isRestrictedGestor(profile)).toBe(false)
  })

  it('keeps a property-scoped gestor restricted from financial navigation', () => {
    const profile = { role: 'gestor', access_all_properties: false }

    expect(hasFullOperationalAccess(profile)).toBe(false)
    expect(isRestrictedGestor(profile)).toBe(true)
  })

  it('keeps administrators fully operational', () => {
    expect(hasFullOperationalAccess({ role: 'admin' })).toBe(true)
  })

  it('does not elevate viewers or guests', () => {
    expect(hasFullOperationalAccess({ role: 'viewer', access_all_properties: true })).toBe(false)
    expect(hasFullOperationalAccess({ role: 'guest', access_all_properties: true })).toBe(false)
  })
})
