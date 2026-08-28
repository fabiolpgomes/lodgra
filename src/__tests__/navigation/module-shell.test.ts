import {
  PUBLIC_MODULES,
  getModuleForPath,
  getModuleNavLinks,
} from '@/lib/navigation/module-shell'

describe('module shell registry', () => {
  it('publishes IA Native in the shell registry', () => {
    const iaNative = PUBLIC_MODULES.find(module => module.id === 'ia-native')

    expect(iaNative).toBeDefined()
    expect(iaNative?.published).toBe(true)
  })

  it('includes IA Native in module navigation links', () => {
    const links = getModuleNavLinks('')

    expect(links.map(link => link.id)).toEqual(['operacao', 'empresa', 'ia-native', 'core', 'proprietario'])
  })

  it('resolves IA Native routes to the module entry', () => {
    expect(getModuleForPath('/ia-native').id).toBe('ia-native')
    expect(getModuleForPath('/pt-BR/ia-native/analyze').id).toBe('ia-native')
    expect(getModuleForPath('/pt-BR/property-intelligence').id).toBe('ia-native')
  })

  it('resolves the reworked core and operation routes to the expected modules', () => {
    expect(getModuleForPath('/dashboard').id).toBe('operacao')
    expect(getModuleForPath('/dashboard/reports').id).toBe('operacao')
    expect(getModuleForPath('/settings').id).toBe('core')
    expect(getModuleForPath('/pt-BR/dashboard/settings/billing').id).toBe('core')
  })

  it('prefers the more specific Empresa module for dashboard empresa routes', () => {
    expect(getModuleForPath('/dashboard/empresa').id).toBe('empresa')
    expect(getModuleForPath('/pt-BR/dashboard/empresa/custos').id).toBe('empresa')
    expect(getModuleForPath('/pt-BR/reports/financeiro').id).toBe('empresa')
  })

  it('treats the docs route as part of IA Native', () => {
    expect(getModuleForPath('/docs').id).toBe('ia-native')
    expect(getModuleForPath('/pt-BR/docs').id).toBe('ia-native')
  })
})
