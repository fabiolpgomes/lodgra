import { getVisibleModuleFeatureLinks } from '../module-shell'

const paths = (isPlatformAdmin?: boolean) =>
  getVisibleModuleFeatureLinks('core', false, { isAdmin: true, hasPremium: true, isPlatformAdmin, organizationId: 'org' }).map(l => l.path)

describe('menu "Plataforma"', () => {
  it('não aparece para admin de tenant', () => {
    expect(paths(false)).not.toContain('/platform')
    expect(paths(undefined)).not.toContain('/platform')
  })

  it('aparece só para o operador da plataforma', () => {
    expect(paths(true)).toContain('/platform')
  })
})
