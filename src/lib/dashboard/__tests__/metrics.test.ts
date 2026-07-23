import {
  calculateADR,
  calculateRevPAR,
  calculateVariationPercent,
  monthKeyFromDate,
  filterRowsByMonth,
  filterRowsByProperties,
  aggregateMonthlyMetricsByCurrency,
  aggregateMonthlyMetricsTotal,
  aggregateManagementFeeByCurrency,
  type MonthlyPropertyMetricRow,
} from '../metrics'

describe('calculateADR', () => {
  it('divide receita bruta por noites vendidas', () => {
    expect(calculateADR(3000, 30)).toBe(100)
  })

  it('retorna 0 quando não há noites vendidas (evita divisão por zero)', () => {
    expect(calculateADR(3000, 0)).toBe(0)
  })

  it('retorna 0 para noites negativas (dado inválido)', () => {
    expect(calculateADR(3000, -5)).toBe(0)
  })

  it('retorna 0 quando gross_revenue não é finito', () => {
    expect(calculateADR(NaN, 10)).toBe(0)
  })
})

describe('calculateRevPAR — RevPAR = ADR × Ocupação', () => {
  it('caso 1: ocupação 50% -> RevPAR é metade do ADR', () => {
    expect(calculateRevPAR(100, 50)).toBe(50)
  })

  it('caso 2: ocupação 0% -> RevPAR é 0, independente do ADR', () => {
    expect(calculateRevPAR(250, 0)).toBe(0)
  })

  it('caso 3: ocupação 100% -> RevPAR é igual ao ADR', () => {
    expect(calculateRevPAR(180, 100)).toBe(180)
  })

  it('caso 4: ADR 0 -> RevPAR é 0 independente da ocupação', () => {
    expect(calculateRevPAR(0, 75)).toBe(0)
  })

  it('caso 5: valores fracionários (ocupação 33%)', () => {
    expect(calculateRevPAR(90, 33)).toBeCloseTo(29.7, 5)
  })

  it('retorna 0 para entradas não finitas', () => {
    expect(calculateRevPAR(NaN, 50)).toBe(0)
    expect(calculateRevPAR(100, NaN)).toBe(0)
  })
})

describe('calculateVariationPercent', () => {
  it('calcula variação positiva corretamente', () => {
    expect(calculateVariationPercent(120, true, 100, true)).toBe(20)
  })

  it('calcula variação negativa corretamente', () => {
    expect(calculateVariationPercent(80, true, 100, true)).toBe(-20)
  })

  it('retorna null quando não há dado no período atual', () => {
    expect(calculateVariationPercent(120, false, 100, true)).toBeNull()
  })

  it('retorna null quando não há dado no período de comparação (ex.: propriedade nova)', () => {
    expect(calculateVariationPercent(120, true, 0, false)).toBeNull()
  })

  it('retorna null (não NaN/Infinity) quando o valor de comparação é 0', () => {
    expect(calculateVariationPercent(120, true, 0, true)).toBeNull()
  })

  it('arredonda para inteiro', () => {
    expect(calculateVariationPercent(103, true, 100, true)).toBe(3)
  })
})

describe('monthKeyFromDate', () => {
  it('formata como YYYY-MM-01', () => {
    expect(monthKeyFromDate(new Date(2026, 6, 15))).toBe('2026-07-01')
  })

  it('preenche mês com zero à esquerda', () => {
    expect(monthKeyFromDate(new Date(2026, 0, 1))).toBe('2026-01-01')
  })
})

describe('filterRowsByMonth / filterRowsByProperties', () => {
  const rows: MonthlyPropertyMetricRow[] = [
    { property_id: 'p1', metric_month: '2026-07-01', gross_revenue: 1000, nights_sold: 10, available_nights: 31, booking_count: 2 },
    { property_id: 'p2', metric_month: '2026-07-01', gross_revenue: 500, nights_sold: 5, available_nights: 31, booking_count: 1 },
    { property_id: 'p1', metric_month: '2026-06-01', gross_revenue: 800, nights_sold: 8, available_nights: 30, booking_count: 2 },
  ]

  it('filtra por mês', () => {
    expect(filterRowsByMonth(rows, '2026-07-01')).toHaveLength(2)
    expect(filterRowsByMonth(rows, '2026-06-01')).toHaveLength(1)
    expect(filterRowsByMonth(rows, '2026-05-01')).toHaveLength(0)
  })

  it('filtra por propriedades selecionadas', () => {
    expect(filterRowsByProperties(rows, ['p1'])).toHaveLength(2)
    expect(filterRowsByProperties(rows, ['p2'])).toHaveLength(1)
    expect(filterRowsByProperties(rows, [])).toHaveLength(0)
  })
})

describe('aggregateMonthlyMetricsByCurrency', () => {
  it('agrupa por moeda usando o mapa propriedade → moeda', () => {
    const rows: MonthlyPropertyMetricRow[] = [
      { property_id: 'p1', metric_month: '2026-07-01', gross_revenue: 1000, nights_sold: 10, available_nights: 31, booking_count: 2 },
      { property_id: 'p2', metric_month: '2026-07-01', gross_revenue: 500, nights_sold: 5, available_nights: 31, booking_count: 1 },
      { property_id: 'p3', metric_month: '2026-07-01', gross_revenue: 2000, nights_sold: 20, available_nights: 31, booking_count: 3 },
    ]
    const propertyCurrencyMap = { p1: 'EUR', p2: 'EUR', p3: 'BRL' }

    const result = aggregateMonthlyMetricsByCurrency(rows, propertyCurrencyMap, 'EUR')

    expect(result.EUR.grossRevenue).toBe(1500)
    expect(result.EUR.nightsSold).toBe(15)
    expect(result.EUR.propertyCount).toBe(2)
    expect(result.BRL.grossRevenue).toBe(2000)
    expect(result.BRL.propertyCount).toBe(1)
  })

  it('usa a moeda de fallback quando a propriedade não está no mapa', () => {
    const rows: MonthlyPropertyMetricRow[] = [
      { property_id: 'unknown', metric_month: '2026-07-01', gross_revenue: 100, nights_sold: 1, available_nights: 31, booking_count: 1 },
    ]
    const result = aggregateMonthlyMetricsByCurrency(rows, {}, 'EUR')
    expect(result.EUR.grossRevenue).toBe(100)
  })

  it('retorna objeto vazio para lista vazia (sinaliza ausência de dado, não zero)', () => {
    expect(aggregateMonthlyMetricsByCurrency([], {}, 'EUR')).toEqual({})
  })
})

describe('aggregateMonthlyMetricsTotal', () => {
  it('soma todas as moedas juntas e conta propriedades distintas', () => {
    const rows: MonthlyPropertyMetricRow[] = [
      { property_id: 'p1', metric_month: '2026-07-01', gross_revenue: 1000, nights_sold: 10, available_nights: 31, booking_count: 2 },
      { property_id: 'p1', metric_month: '2026-07-01', gross_revenue: 200, nights_sold: 2, available_nights: 31, booking_count: 1 },
      { property_id: 'p2', metric_month: '2026-07-01', gross_revenue: 500, nights_sold: 5, available_nights: 31, booking_count: 1 },
    ]
    const totals = aggregateMonthlyMetricsTotal(rows)
    expect(totals.grossRevenue).toBe(1700)
    expect(totals.bookingCount).toBe(4)
    expect(totals.propertyCount).toBe(2)
    expect(totals.rowCount).toBe(3)
  })
})

describe('aggregateManagementFeeByCurrency', () => {
  it('calcula comissão de gestão por propriedade e agrupa por moeda', () => {
    const rows: MonthlyPropertyMetricRow[] = [
      { property_id: 'p1', metric_month: '2026-07-01', gross_revenue: 1000, nights_sold: 10, available_nights: 31, booking_count: 2 },
      { property_id: 'p2', metric_month: '2026-07-01', gross_revenue: 2000, nights_sold: 20, available_nights: 31, booking_count: 3 },
    ]
    const propertyMeta = {
      p1: { currency: 'EUR', managementPercentage: 20 },
      p2: { currency: 'EUR', managementPercentage: 10 },
    }

    const result = aggregateManagementFeeByCurrency(rows, propertyMeta, 'EUR')

    // p1: 1000 * 20% = 200 | p2: 2000 * 10% = 200 -> total 400
    expect(result.EUR.commission).toBe(400)
    expect(result.EUR.rowCount).toBe(2)
  })

  it('trata propriedade sem management_percentage cadastrado como comissão 0', () => {
    const rows: MonthlyPropertyMetricRow[] = [
      { property_id: 'p1', metric_month: '2026-07-01', gross_revenue: 1000, nights_sold: 10, available_nights: 31, booking_count: 2 },
    ]
    const result = aggregateManagementFeeByCurrency(rows, {}, 'EUR')
    expect(result.EUR.commission).toBe(0)
  })
})
