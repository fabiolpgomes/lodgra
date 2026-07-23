import {
  calculateADR,
  calculatePropertyRevPAR,
  buildPropertyRanking,
  splitTopBottomCounts,
  type PropertyMetricRow,
} from '../propertyRanking'

function makeRow(overrides: Partial<PropertyMetricRow> & { property_id: string }): PropertyMetricRow {
  return {
    property_name: null,
    gross_revenue: 0,
    nights_sold: 0,
    available_nights: 30,
    booking_count: 0,
    ...overrides,
  }
}

describe('calculateADR', () => {
  it('calcula gross_revenue / nights_sold', () => {
    expect(calculateADR({ gross_revenue: 3000, nights_sold: 20 })).toBe(150)
  })

  it('retorna 0 quando nights_sold é 0 (evita divisão por zero)', () => {
    expect(calculateADR({ gross_revenue: 3000, nights_sold: 0 })).toBe(0)
  })

  it('retorna 0 quando nights_sold é negativo', () => {
    expect(calculateADR({ gross_revenue: 3000, nights_sold: -5 })).toBe(0)
  })
})

describe('calculatePropertyRevPAR', () => {
  it('calcula ADR × (nights_sold / available_nights)', () => {
    // ADR = 3000/20 = 150; RevPAR = 150 × (20/30) = 100
    expect(calculatePropertyRevPAR({ gross_revenue: 3000, nights_sold: 20, available_nights: 30 })).toBeCloseTo(100)
  })

  it('retorna 0 quando nights_sold é 0', () => {
    expect(calculatePropertyRevPAR({ gross_revenue: 0, nights_sold: 0, available_nights: 30 })).toBe(0)
  })

  it('retorna 0 quando available_nights é 0 (evita divisão por zero)', () => {
    expect(calculatePropertyRevPAR({ gross_revenue: 3000, nights_sold: 20, available_nights: 0 })).toBe(0)
  })
})

describe('splitTopBottomCounts', () => {
  it('N=0 → 0/0', () => {
    expect(splitTopBottomCounts(0)).toEqual({ topCount: 0, bottomCount: 0 })
  })

  it('N=1 → 1/0 (nada para comparar no bottom)', () => {
    expect(splitTopBottomCounts(1)).toEqual({ topCount: 1, bottomCount: 0 })
  })

  it('N=2 → 1/1', () => {
    expect(splitTopBottomCounts(2)).toEqual({ topCount: 1, bottomCount: 1 })
  })

  it('N=4 → 2/2 (balanceado, não 3/1)', () => {
    expect(splitTopBottomCounts(4)).toEqual({ topCount: 2, bottomCount: 2 })
  })

  it('N=5 → 3/2', () => {
    expect(splitTopBottomCounts(5)).toEqual({ topCount: 3, bottomCount: 2 })
  })

  it('N=6 → 3/3 (caso padrão)', () => {
    expect(splitTopBottomCounts(6)).toEqual({ topCount: 3, bottomCount: 3 })
  })

  it('N=10 → 3/3 (nunca mais que 3 de cada lado)', () => {
    expect(splitTopBottomCounts(10)).toEqual({ topCount: 3, bottomCount: 3 })
  })
})

describe('buildPropertyRanking', () => {
  it('caso <6 propriedades: não duplica a mesma propriedade em top e bottom', () => {
    const properties = [
      { id: 'p1', name: 'Casa A' },
      { id: 'p2', name: 'Casa B' },
      { id: 'p3', name: 'Casa C' },
      { id: 'p4', name: 'Casa D' },
    ]
    const rows: PropertyMetricRow[] = [
      makeRow({ property_id: 'p1', gross_revenue: 4000, nights_sold: 20, available_nights: 30, booking_count: 5 }), // RevPAR ~133.3
      makeRow({ property_id: 'p2', gross_revenue: 3000, nights_sold: 20, available_nights: 30, booking_count: 4 }), // RevPAR 100
      makeRow({ property_id: 'p3', gross_revenue: 1500, nights_sold: 15, available_nights: 30, booking_count: 3 }), // RevPAR 50
      makeRow({ property_id: 'p4', gross_revenue: 600, nights_sold: 10, available_nights: 30, booking_count: 2 }),  // RevPAR 20
    ]

    const result = buildPropertyRanking(rows, properties)

    expect(result.top).toHaveLength(2)
    expect(result.bottom).toHaveLength(2)

    const topIds = result.top.map(p => p.propertyId)
    const bottomIds = result.bottom.map(p => p.propertyId)
    const overlap = topIds.filter(id => bottomIds.includes(id))
    expect(overlap).toHaveLength(0)

    expect(topIds).toEqual(['p1', 'p2'])
    // bottom ordenado do pior para o menos pior
    expect(bottomIds).toEqual(['p4', 'p3'])
    expect(result.withoutBookings).toHaveLength(0)
  })

  it('propriedade sem reservas no mês (booking_count = 0) não entra no ranking numérico', () => {
    const properties = [
      { id: 'p1', name: 'Casa A' },
      { id: 'p2', name: 'Casa Sem Reservas' },
    ]
    const rows: PropertyMetricRow[] = [
      makeRow({ property_id: 'p1', gross_revenue: 3000, nights_sold: 20, available_nights: 30, booking_count: 4 }),
      makeRow({ property_id: 'p2', gross_revenue: 0, nights_sold: 0, available_nights: 30, booking_count: 0 }),
    ]

    const result = buildPropertyRanking(rows, properties)

    expect(result.top.map(p => p.propertyId)).toEqual(['p1'])
    expect(result.bottom).toHaveLength(0)
    expect(result.withoutBookings).toEqual([{ propertyId: 'p2', propertyName: 'Casa Sem Reservas' }])
  })

  it('propriedade ausente de monthly_property_metrics para o mês (sem linha) também vai para withoutBookings', () => {
    const properties = [
      { id: 'p1', name: 'Casa A' },
      { id: 'p2', name: 'Casa Ausente Da View' },
    ]
    const rows: PropertyMetricRow[] = [
      makeRow({ property_id: 'p1', gross_revenue: 3000, nights_sold: 20, available_nights: 30, booking_count: 4 }),
      // p2 não tem nenhuma linha na view para este mês
    ]

    const result = buildPropertyRanking(rows, properties)

    expect(result.withoutBookings).toEqual([{ propertyId: 'p2', propertyName: 'Casa Ausente Da View' }])
    expect(result.top.map(p => p.propertyId)).toEqual(['p1'])
  })

  it('empate de RevPAR é desempatado deterministicamente por nome', () => {
    const properties = [
      { id: 'p1', name: 'Zebra House' },
      { id: 'p2', name: 'Alpha House' },
      { id: 'p3', name: 'Beta House' },
    ]
    // Todas com RevPAR idêntico: ADR=100 × (10/30) = 33.33...
    const rows: PropertyMetricRow[] = [
      makeRow({ property_id: 'p1', gross_revenue: 1000, nights_sold: 10, available_nights: 30, booking_count: 2 }),
      makeRow({ property_id: 'p2', gross_revenue: 1000, nights_sold: 10, available_nights: 30, booking_count: 2 }),
      makeRow({ property_id: 'p3', gross_revenue: 1000, nights_sold: 10, available_nights: 30, booking_count: 2 }),
    ]

    const result = buildPropertyRanking(rows, properties)

    // Com RevPAR empatado, ordem determinística por nome alfabético (Alpha, Beta, Zebra)
    const allSorted = [...result.top, ...result.bottom].map(p => p.propertyName)
    expect(allSorted).toEqual(['Alpha House', 'Beta House', 'Zebra House'])

    // Rodar de novo deve produzir exatamente a mesma ordem (determinístico)
    const result2 = buildPropertyRanking(rows, properties)
    const allSorted2 = [...result2.top, ...result2.bottom].map(p => p.propertyName)
    expect(allSorted2).toEqual(allSorted)
  })

  it('lista vazia de propriedades retorna ranking vazio sem erro', () => {
    const result = buildPropertyRanking([], [])
    expect(result).toEqual({ top: [], bottom: [], withoutBookings: [] })
  })

  it('usa property_name da linha da view como fallback quando allProperties não tem nome', () => {
    const properties = [{ id: 'p1', name: null }]
    const rows: PropertyMetricRow[] = [
      makeRow({ property_id: 'p1', property_name: 'Nome Vindo Da View', gross_revenue: 1000, nights_sold: 10, available_nights: 30, booking_count: 2 }),
    ]
    const result = buildPropertyRanking(rows, properties)
    expect(result.top[0].propertyName).toBe('Nome Vindo Da View')
  })
})
