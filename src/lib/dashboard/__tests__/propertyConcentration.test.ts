import {
  buildPropertyConcentrationAlert,
  PROPERTY_CONCENTRATION_THRESHOLD,
  type PropertyRevenueInput,
} from '../propertyConcentration'

function makeRow(overrides: Partial<PropertyRevenueInput> & { propertyId: string }): PropertyRevenueInput {
  return {
    propertyName: 'Propriedade',
    grossRevenue: 0,
    ...overrides,
  }
}

describe('PROPERTY_CONCENTRATION_THRESHOLD', () => {
  it('é 40 (independente do threshold de canal, 60%)', () => {
    expect(PROPERTY_CONCENTRATION_THRESHOLD).toBe(40)
  })
})

describe('buildPropertyConcentrationAlert', () => {
  it('retorna null quando não há receita (rows vazio)', () => {
    expect(buildPropertyConcentrationAlert([])).toBeNull()
  })

  it('retorna null quando a receita total é 0', () => {
    const rows = [makeRow({ propertyId: 'a', grossRevenue: 0 }), makeRow({ propertyId: 'b', grossRevenue: 0 })]
    expect(buildPropertyConcentrationAlert(rows)).toBeNull()
  })

  it('retorna null quando nenhuma propriedade ultrapassa 40%', () => {
    // 3 propriedades com receita igual → 33.3% cada, nenhuma > 40%
    const rows = [
      makeRow({ propertyId: 'a', propertyName: 'A', grossRevenue: 1000 }),
      makeRow({ propertyId: 'b', propertyName: 'B', grossRevenue: 1000 }),
      makeRow({ propertyId: 'c', propertyName: 'C', grossRevenue: 1000 }),
    ]
    expect(buildPropertyConcentrationAlert(rows)).toBeNull()
  })

  it('retorna alerta quando 1 propriedade ultrapassa 40% da receita', () => {
    // A = 5000 de um total de 10000 = 50% > 40%
    const rows = [
      makeRow({ propertyId: 'a', propertyName: 'Casa A', grossRevenue: 5000 }),
      makeRow({ propertyId: 'b', propertyName: 'Casa B', grossRevenue: 3000 }),
      makeRow({ propertyId: 'c', propertyName: 'Casa C', grossRevenue: 2000 }),
    ]
    const alert = buildPropertyConcentrationAlert(rows)
    expect(alert).not.toBeNull()
    expect(alert?.propertyId).toBe('a')
    expect(alert?.propertyName).toBe('Casa A')
    expect(alert?.revenuePercent).toBeCloseTo(50)
  })

  it('é o limite exato (40% exatos) NÃO dispara alerta (estritamente maior que o threshold)', () => {
    // Dominante (a) = 400 de um total de 1000 = exatos 40%
    const rows = [
      makeRow({ propertyId: 'a', grossRevenue: 400 }),
      makeRow({ propertyId: 'b', grossRevenue: 300 }),
      makeRow({ propertyId: 'c', grossRevenue: 300 }),
    ]
    expect(buildPropertyConcentrationAlert(rows)).toBeNull()
  })

  it('40.01% dispara alerta', () => {
    // Dominante (a) = 4001 de um total de 10000 = 40.01%
    const rows = [
      makeRow({ propertyId: 'a', grossRevenue: 4001 }),
      makeRow({ propertyId: 'b', grossRevenue: 3999 }),
      makeRow({ propertyId: 'c', grossRevenue: 2000 }),
    ]
    const alert = buildPropertyConcentrationAlert(rows)
    expect(alert).not.toBeNull()
    expect(alert?.propertyId).toBe('a')
  })

  it('respeita um threshold customizado', () => {
    // Dominante (a) = 3000 de um total de 10000 = 30%
    const rows = [
      makeRow({ propertyId: 'a', grossRevenue: 3000 }),
      makeRow({ propertyId: 'b', grossRevenue: 2400 }),
      makeRow({ propertyId: 'c', grossRevenue: 2400 }),
      makeRow({ propertyId: 'd', grossRevenue: 2200 }),
    ]
    // 30% não ultrapassa o threshold default (40%), mas ultrapassa um threshold de 20%
    expect(buildPropertyConcentrationAlert(rows, 40)).toBeNull()
    const alert = buildPropertyConcentrationAlert(rows, 20)
    expect(alert?.propertyId).toBe('a')
    expect(alert?.revenuePercent).toBeCloseTo(30)
  })

  it('usa "Propriedade sem nome" quando propertyName é null/undefined', () => {
    const rows = [
      makeRow({ propertyId: 'a', propertyName: null, grossRevenue: 5000 }),
      makeRow({ propertyId: 'b', grossRevenue: 1000 }),
    ]
    const alert = buildPropertyConcentrationAlert(rows)
    expect(alert?.propertyName).toBe('Propriedade sem nome')
  })

  it('desempata por nome/id quando há empate exato de receita', () => {
    const rows = [
      makeRow({ propertyId: 'z', propertyName: 'Zulu', grossRevenue: 5000 }),
      makeRow({ propertyId: 'a', propertyName: 'Alfa', grossRevenue: 5000 }),
    ]
    const alert = buildPropertyConcentrationAlert(rows, 0)
    expect(alert?.propertyId).toBe('a')
  })
})
