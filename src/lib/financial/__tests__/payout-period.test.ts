import {
  adaptPayoutDataForPeriod,
  allocateMinorByMonth,
  buildPayoutPreview,
  getCivilMonthPeriod,
  getPreviousCivilMonth,
  getReservationMonthBuckets,
  parseDecimalToMinor,
  PayoutDataIncompleteError,
  type PayoutReservationRow,
} from '../payout-period'
import type { RegraRepasse } from '../payout-rules'

const organizationId = 'org-1'
const propertyId = 'property-1'
const completeLineage = {
  grossRevenueSemantics: 'exclusive_service_fees' as const,
  serviceFeeSnapshot: true,
  cleaningFeeAmount: '20.00',
  otaFeeSnapshot: true,
}

function reservation(overrides: Partial<PayoutReservationRow> = {}): PayoutReservationRow {
  return {
    id: 'reservation-1',
    organizationId,
    propertyId,
    status: 'confirmed',
    checkIn: '2026-08-10',
    checkOut: '2026-08-20',
    currency: 'EUR',
    totalAmount: '1000.00',
    serviceFeeAmount: '50.00',
    platformFee: '120.00',
    discountAmount: '10.00',
    lineage: completeLineage,
    ...overrides,
  }
}

const rule: RegraRepasse = {
  id: 'rule-1',
  organizationId,
  propriedadeId: propertyId,
  tipoComissao: 'percentual',
  comissaoValor: '20',
  baseComissao: 'receita_bruta',
  taxaLimpezaPara: 'gestor',
  comissaoOtaPorConta: 'proprietario',
  despesasRepassaveis: true,
}

describe('payout civil month helpers', () => {
  it('builds inclusive UTC month boundaries, including leap years', () => {
    expect(getCivilMonthPeriod('2028-02')).toEqual({
      month: '2028-02',
      inicio: '2028-02-01',
      fim: '2028-02-29',
    })
    expect(() => getCivilMonthPeriod('2028-13')).toThrow('YYYY-MM')
  })

  it('returns the previous civil month across a year boundary', () => {
    expect(getPreviousCivilMonth(new Date('2026-01-15T23:30:00-11:00'))).toEqual({
      month: '2025-12',
      inicio: '2025-12-01',
      fim: '2025-12-31',
    })
    expect(getPreviousCivilMonth(new Date('2026-01-01T00:00:00.000Z')).month).toBe('2025-12')
  })

  it.each([
    ['2026-01-01', '2026-01-31', 30, '2026-01'],
    ['2026-12-01', '2027-01-01', 31, '2027-01'],
    ['2026-01-01', '2026-03-02', 60, '2026-03'],
  ])('allocates %s–%s (%i nights) to %s', (checkIn, checkOut, nights, month) => {
    expect(getReservationMonthBuckets(checkIn, checkOut)).toEqual({
      totalNights: nights,
      buckets: [{ month, occupiedNights: nights }],
    })
  })

  it('allocates 61 nights across occupied UTC months', () => {
    expect(getReservationMonthBuckets('2026-01-01', '2026-03-03')).toEqual({
      totalNights: 61,
      buckets: [
        { month: '2026-01', occupiedNights: 31 },
        { month: '2026-02', occupiedNights: 28 },
        { month: '2026-03', occupiedNights: 2 },
      ],
    })
  })

  it('reconciles integer allocation residue in the last eligible month', () => {
    const allocation = allocateMinorByMonth(10_001, 61, [
      { month: '2026-01', occupiedNights: 31 },
      { month: '2026-02', occupiedNights: 28 },
      { month: '2026-03', occupiedNights: 2 },
    ])
    expect(Array.from(allocation.values()).reduce((sum, value) => sum + value, 0)).toBe(10_001)
    expect(allocation.get('2026-03')).toBe(329)
  })

  it('parses decimal amounts without floating point and rejects unsafe precision', () => {
    expect(parseDecimalToMinor('90071992547409.91', 'amount')).toBe(Number.MAX_SAFE_INTEGER)
    expect(parseDecimalToMinor('0.10', 'amount')).toBe(10)
    expect(() => parseDecimalToMinor('1.001', 'amount')).toThrow('duas casas')
  })
})

describe('payout data adapter', () => {
  const period = getCivilMonthPeriod('2026-08')

  it('adapts complete rows, excludes cancelled/cross-tenant rows and keeps traceable ids', () => {
    const adapted = adaptPayoutDataForPeriod({
      organizationId,
      propertyId,
      currency: 'EUR',
      period,
      reservations: [
        reservation(),
        reservation({ id: 'cancelled', status: 'cancelled' }),
        reservation({ id: 'cross-tenant', organizationId: 'org-2' }),
      ],
      expenses: [{
        id: 'expense-1', organizationId, propertyId, expenseDate: '2026-08-31', currency: 'EUR', amount: '25.50',
      }],
    })
    expect(adapted.reservas).toEqual([{
      id: 'reservation-1',
      currency: 'EUR',
      receitaBrutaMinor: 100_000,
      taxasServicoMinor: 5_000,
      taxaLimpezaMinor: 2_000,
      comissaoOtaMinor: 12_000,
      descontosMinor: 1_000,
    }])
    expect(adapted.despesas).toEqual([{ id: 'expense-1', currency: 'EUR', valorMinor: 2_550 }])
  })

  it('returns an empty valid dataset for a period without eligible items', () => {
    expect(adaptPayoutDataForPeriod({
      organizationId,
      propertyId,
      currency: 'EUR',
      period,
      reservations: [reservation({ checkIn: '2026-07-01', checkOut: '2026-07-10' })],
      expenses: [],
    })).toEqual({ reservas: [], despesas: [] })
  })

  it('fails safe with typed issues for ambiguous financial lineage', () => {
    expect.assertions(2)
    try {
      adaptPayoutDataForPeriod({
        organizationId,
        propertyId,
        currency: 'EUR',
        period,
        reservations: [reservation({
          platformFee: null,
          lineage: {
            grossRevenueSemantics: 'unknown',
            serviceFeeSnapshot: false,
            cleaningFeeAmount: null,
            otaFeeSnapshot: false,
          },
        })],
        expenses: [],
      })
    } catch (error) {
      expect(error).toBeInstanceOf(PayoutDataIncompleteError)
      expect((error as PayoutDataIncompleteError).issues.map(item => item.code)).toEqual(expect.arrayContaining([
        'AMBIGUOUS_GROSS_REVENUE',
        'MISSING_SERVICE_FEE_SNAPSHOT',
        'MISSING_CLEANING_FEE_BREAKDOWN',
        'MISSING_OTA_FEE',
      ]))
    }
  })

  it('maps an invalid cleaning breakdown to a typed 422-compatible issue', () => {
    expect(() => buildPayoutPreview({
      organizationId,
      propertyId,
      currency: 'EUR',
      period,
      reservations: [reservation({
        serviceFeeAmount: '10.00',
        lineage: { ...completeLineage, cleaningFeeAmount: '20.00' },
      })],
      expenses: [],
      rule,
    })).toThrow(PayoutDataIncompleteError)

    try {
      buildPayoutPreview({
        organizationId,
        propertyId,
        currency: 'EUR',
        period,
        reservations: [reservation({
          serviceFeeAmount: '10.00',
          lineage: { ...completeLineage, cleaningFeeAmount: '20.00' },
        })],
        expenses: [],
        rule,
      })
    } catch (error) {
      expect((error as PayoutDataIncompleteError).issues).toContainEqual({
        code: 'INVALID_FINANCIAL_VALUE',
        entityType: 'reservation',
        entityId: 'reservation-1',
        field: 'cleaning_fee_amount',
      })
    }
  })

  it('maps a negative percentage base to a typed 422-compatible issue', () => {
    try {
      buildPayoutPreview({
        organizationId,
        propertyId,
        currency: 'EUR',
        period,
        reservations: [reservation({
          totalAmount: '100.00',
          serviceFeeAmount: '0.00',
          platformFee: '200.00',
          discountAmount: '0.00',
          lineage: { ...completeLineage, cleaningFeeAmount: '0.00' },
        })],
        expenses: [],
        rule: { ...rule, baseComissao: 'faturamento_propriedade' },
      })
      throw new Error('expected buildPayoutPreview to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(PayoutDataIncompleteError)
      expect((error as PayoutDataIncompleteError).issues).toContainEqual({
        code: 'INVALID_FINANCIAL_VALUE',
        entityType: 'dataset',
        field: 'commission_base',
      })
    }
  })

  it.each([
    { name: 'duplicate reservation', rows: [reservation(), reservation()], currency: 'EUR', code: 'DUPLICATE_RESERVATION' },
    { name: 'currency mismatch', rows: [reservation({ currency: 'USD' })], currency: 'EUR', code: 'CURRENCY_MISMATCH' },
    { name: 'unsupported currency', rows: [reservation({ currency: 'JPY' })], currency: 'JPY', code: 'UNSUPPORTED_CURRENCY' },
    { name: 'invalid dates', rows: [reservation({ checkOut: 'not-a-date' })], currency: 'EUR', code: 'INVALID_RESERVATION_DATES' },
  ])('rejects $name', ({ rows, currency, code }) => {
    expect(() => adaptPayoutDataForPeriod({
      organizationId,
      propertyId,
      currency,
      period,
      reservations: rows,
      expenses: [],
    })).toThrow(PayoutDataIncompleteError)
    try {
      adaptPayoutDataForPeriod({ organizationId, propertyId, currency, period, reservations: rows, expenses: [] })
    } catch (error) {
      expect((error as PayoutDataIncompleteError).issues.map(item => item.code)).toContain(code)
    }
  })

  it('calls the canonical calculation for a complete empty period including fixed monthly commission', () => {
    const result = buildPayoutPreview({
      organizationId,
      propertyId,
      currency: 'EUR',
      period,
      reservations: [],
      expenses: [],
      rule: { ...rule, tipoComissao: 'fixo_mensal', comissaoValor: '250.00' },
    })
    expect(result.linhas.comissao_gestao.valorMinor).toBe(25_000)
    expect(result.linhas.repasse_proprietario.valorMinor).toBe(-25_000)
  })
})
