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

    expect(links.map(link => link.id)).toEqual(['core', 'operacao', 'empresa', 'proprietario', 'ia-native'])
  })

  it('resolves IA Native routes to the module entry', () => {
    expect(getModuleForPath('/ia-native').id).toBe('ia-native')
    expect(getModuleForPath('/pt-BR/property-intelligence').id).toBe('ia-native')
  })
})
