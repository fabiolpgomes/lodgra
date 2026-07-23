import {
  isPlaceholderGuestName,
  buildPlaceholderGuestAlerts,
  buildSyncFailureAlert,
  buildPendingPaymentAlerts,
  calculateProspectiveOccupancy,
  buildLowOccupancyAlerts,
  PENDING_PAYMENT_ALERT_HOURS,
  LOW_OCCUPANCY_ALERT_THRESHOLD,
  LOW_OCCUPANCY_WINDOW_DAYS,
  type PlaceholderGuestReservationInput,
  type PendingPaymentReservationInput,
  type ProspectiveReservationInput,
} from '../notificationAlerts'

// ─── 1. Placeholder guest detection ────────────────────────────────────────

describe('isPlaceholderGuestName', () => {
  it('detecta a string real usada no código: "Hóspede" (maiúscula, acentuada)', () => {
    expect(isPlaceholderGuestName('Hóspede')).toBe(true)
  })

  it('NÃO detecta a variante minúscula "hóspede" (a spec-fonte errou o case, o código usa maiúscula)', () => {
    expect(isPlaceholderGuestName('hóspede')).toBe(false)
  })

  it('não detecta um nome real', () => {
    expect(isPlaceholderGuestName('Maria Silva')).toBe(false)
    expect(isPlaceholderGuestName('João')).toBe(false)
  })

  it('não detecta null/undefined como placeholder (ausência de nome é um caso diferente)', () => {
    expect(isPlaceholderGuestName(null)).toBe(false)
    expect(isPlaceholderGuestName(undefined)).toBe(false)
  })

  it('não detecta string vazia', () => {
    expect(isPlaceholderGuestName('')).toBe(false)
  })
})

describe('buildPlaceholderGuestAlerts', () => {
  function makeReservation(
    overrides: Partial<PlaceholderGuestReservationInput> & { reservationId: string }
  ): PlaceholderGuestReservationInput {
    return {
      guestFirstName: 'Hóspede',
      propertyName: 'Casa da Praia',
      checkIn: '2026-08-01',
      ...overrides,
    }
  }

  it('gera 1 alerta por reserva com nome placeholder', () => {
    const alerts = buildPlaceholderGuestAlerts([makeReservation({ reservationId: 'r1' })])
    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('placeholder_guest')
    expect(alerts[0].reservationId).toBe('r1')
    expect(alerts[0].message).toContain('Casa da Praia')
  })

  it('não gera alerta para reservas com nome real', () => {
    const alerts = buildPlaceholderGuestAlerts([
      makeReservation({ reservationId: 'r1', guestFirstName: 'Maria' }),
    ])
    expect(alerts).toHaveLength(0)
  })

  it('a mensagem inclui o nome da propriedade (nunca genérica)', () => {
    const alerts = buildPlaceholderGuestAlerts([
      makeReservation({ reservationId: 'r1', propertyName: 'Apartamento Central' }),
    ])
    expect(alerts[0].message).toContain('Apartamento Central')
  })

  it('usa "Propriedade" como fallback quando propertyName é null', () => {
    const alerts = buildPlaceholderGuestAlerts([makeReservation({ reservationId: 'r1', propertyName: null })])
    expect(alerts[0].message).toContain('Propriedade')
  })

  it('filtra múltiplas reservas, mantendo só as com placeholder', () => {
    const alerts = buildPlaceholderGuestAlerts([
      makeReservation({ reservationId: 'r1', guestFirstName: 'Hóspede' }),
      makeReservation({ reservationId: 'r2', guestFirstName: 'Ana' }),
      makeReservation({ reservationId: 'r3', guestFirstName: 'Hóspede' }),
    ])
    expect(alerts.map((a) => a.reservationId)).toEqual(['r1', 'r3'])
  })
})

// ─── 2. Sync failure ────────────────────────────────────────────────────

describe('buildSyncFailureAlert', () => {
  it('retorna null quando não há log', () => {
    expect(buildSyncFailureAlert(null)).toBeNull()
    expect(buildSyncFailureAlert(undefined)).toBeNull()
  })

  it('retorna null quando o último sync foi bem-sucedido', () => {
    expect(
      buildSyncFailureAlert({ status: 'success', errorMessage: null, syncedAtFormatted: '23/07 10:00' })
    ).toBeNull()
  })

  it('retorna alerta quando o último sync falhou', () => {
    const alert = buildSyncFailureAlert({
      status: 'failed',
      errorMessage: 'Timeout ao conectar ao iCal',
      syncedAtFormatted: '23/07 10:00',
    })
    expect(alert).not.toBeNull()
    expect(alert?.type).toBe('sync_failure')
    expect(alert?.message).toContain('23/07 10:00')
    expect(alert?.message).toContain('Timeout ao conectar ao iCal')
  })

  it('funciona sem error_message (não quebra a mensagem)', () => {
    const alert = buildSyncFailureAlert({ status: 'failed', errorMessage: null, syncedAtFormatted: '23/07 10:00' })
    expect(alert?.message).toBe('Falha na sincronização às 23/07 10:00')
  })
})

// ─── 3. Pending payment ───────────────────────────────────────────────────

describe('PENDING_PAYMENT_ALERT_HOURS', () => {
  it('é 48h (placeholder documentado — TODO confirmar com Fabio)', () => {
    expect(PENDING_PAYMENT_ALERT_HOURS).toBe(48)
  })
})

describe('buildPendingPaymentAlerts', () => {
  function makeReservation(
    overrides: Partial<PendingPaymentReservationInput> & { reservationId: string; createdAt: string }
  ): PendingPaymentReservationInput {
    return {
      propertyName: 'Casa Azul',
      totalAmount: 500,
      currency: 'EUR',
      ...overrides,
    }
  }

  const now = new Date('2026-07-23T12:00:00Z')

  it('não gera alerta para reserva criada há menos de 48h', () => {
    const createdAt = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString() // 10h atrás
    const alerts = buildPendingPaymentAlerts([makeReservation({ reservationId: 'r1', createdAt })], now)
    expect(alerts).toHaveLength(0)
  })

  it('gera alerta para reserva criada há exatamente 48h (limite inclusivo)', () => {
    const createdAt = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
    const alerts = buildPendingPaymentAlerts([makeReservation({ reservationId: 'r1', createdAt })], now)
    expect(alerts).toHaveLength(1)
  })

  it('gera alerta para reserva criada há mais de 48h', () => {
    const createdAt = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString() // 72h atrás
    const alerts = buildPendingPaymentAlerts([makeReservation({ reservationId: 'r1', createdAt })], now)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('pending_payment')
    expect(alerts[0].message).toContain('48h')
    expect(alerts[0].message).toContain('Casa Azul')
  })

  it('respeita um threshold customizado', () => {
    const createdAt = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString() // 10h atrás
    const alerts = buildPendingPaymentAlerts([makeReservation({ reservationId: 'r1', createdAt })], now, 5)
    expect(alerts).toHaveLength(1)
  })

  it('ignora createdAt inválido em vez de quebrar', () => {
    const alerts = buildPendingPaymentAlerts(
      [makeReservation({ reservationId: 'r1', createdAt: 'not-a-date' })],
      now
    )
    expect(alerts).toHaveLength(0)
  })
})

// ─── 4. Low occupancy (prospectiva, 30 dias) ───────────────────────────────

describe('LOW_OCCUPANCY_ALERT_THRESHOLD / LOW_OCCUPANCY_WINDOW_DAYS', () => {
  it('threshold é 30% e janela é 30 dias (definidos na spec-fonte)', () => {
    expect(LOW_OCCUPANCY_ALERT_THRESHOLD).toBe(30)
    expect(LOW_OCCUPANCY_WINDOW_DAYS).toBe(30)
  })
})

describe('calculateProspectiveOccupancy', () => {
  const windowStart = new Date('2026-08-01T00:00:00')
  const properties = [
    { id: 'p1', name: 'Casa 1' },
    { id: 'p2', name: 'Casa 2' },
  ]

  it('calcula 100% quando a propriedade está reservada durante toda a janela de 30 dias', () => {
    const reservations: ProspectiveReservationInput[] = [
      { propertyId: 'p1', checkIn: '2026-08-01', checkOut: '2026-08-31' },
    ]
    const result = calculateProspectiveOccupancy(reservations, properties, windowStart, 30)
    const p1 = result.find((r) => r.propertyId === 'p1')
    expect(p1?.occupancyPercent).toBeCloseTo(100)
  })

  it('calcula 0% quando não há nenhuma reserva na janela', () => {
    const result = calculateProspectiveOccupancy([], properties, windowStart, 30)
    expect(result.every((r) => r.occupancyPercent === 0)).toBe(true)
  })

  it('calcula corretamente uma reserva parcial (15 de 30 noites = 50%)', () => {
    const reservations: ProspectiveReservationInput[] = [
      { propertyId: 'p1', checkIn: '2026-08-01', checkOut: '2026-08-16' },
    ]
    const result = calculateProspectiveOccupancy(reservations, properties, windowStart, 30)
    const p1 = result.find((r) => r.propertyId === 'p1')
    expect(p1?.occupancyPercent).toBeCloseTo(50)
  })

  it('soma múltiplas reservas não sobrepostas da mesma propriedade', () => {
    const reservations: ProspectiveReservationInput[] = [
      { propertyId: 'p1', checkIn: '2026-08-01', checkOut: '2026-08-06' }, // 5 noites
      { propertyId: 'p1', checkIn: '2026-08-10', checkOut: '2026-08-15' }, // 5 noites
    ]
    const result = calculateProspectiveOccupancy(reservations, properties, windowStart, 30)
    const p1 = result.find((r) => r.propertyId === 'p1')
    // 10 noites / 30 dias = 33.3%
    expect(p1?.occupancyPercent).toBeCloseTo((10 / 30) * 100)
  })

  it('corta (clampa) reservas que começam antes da janela', () => {
    const reservations: ProspectiveReservationInput[] = [
      { propertyId: 'p1', checkIn: '2026-07-25', checkOut: '2026-08-06' }, // só 5 noites dentro da janela
    ]
    const result = calculateProspectiveOccupancy(reservations, properties, windowStart, 30)
    const p1 = result.find((r) => r.propertyId === 'p1')
    expect(p1?.occupancyPercent).toBeCloseTo((5 / 30) * 100)
  })

  it('corta (clampa) reservas que terminam depois da janela', () => {
    const reservations: ProspectiveReservationInput[] = [
      { propertyId: 'p1', checkIn: '2026-08-25', checkOut: '2026-09-10' }, // só 6 noites dentro da janela (25→31)
    ]
    const result = calculateProspectiveOccupancy(reservations, properties, windowStart, 30)
    const p1 = result.find((r) => r.propertyId === 'p1')
    expect(p1?.occupancyPercent).toBeCloseTo((6 / 30) * 100)
  })

  it('retorna uma linha por propriedade, mesmo sem reserva', () => {
    const result = calculateProspectiveOccupancy([], properties, windowStart, 30)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.propertyId).sort()).toEqual(['p1', 'p2'])
  })

  it('usa "Propriedade sem nome" quando o nome é null', () => {
    const result = calculateProspectiveOccupancy(
      [],
      [{ id: 'p1', name: null }],
      windowStart,
      30
    )
    expect(result[0].propertyName).toBe('Propriedade sem nome')
  })
})

describe('buildLowOccupancyAlerts', () => {
  it('gera alerta com o nome do imóvel para ocupação abaixo do threshold', () => {
    const forecasts = [
      { propertyId: 'p1', propertyName: 'Casa da Serra', occupancyPercent: 15 },
      { propertyId: 'p2', propertyName: 'Casa da Praia', occupancyPercent: 80 },
    ]
    const alerts = buildLowOccupancyAlerts(forecasts)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('low_occupancy')
    expect(alerts[0].message).toContain('Casa da Serra')
    expect(alerts[0].message).not.toContain('Casa da Praia')
  })

  it('não gera alerta no limite exato de 30% (estritamente menor que o threshold)', () => {
    const forecasts = [{ propertyId: 'p1', propertyName: 'Casa X', occupancyPercent: 30 }]
    expect(buildLowOccupancyAlerts(forecasts)).toHaveLength(0)
  })

  it('gera alerta em 29.9%', () => {
    const forecasts = [{ propertyId: 'p1', propertyName: 'Casa X', occupancyPercent: 29.9 }]
    expect(buildLowOccupancyAlerts(forecasts)).toHaveLength(1)
  })

  it('ordena por ocupação asc (mais crítico primeiro)', () => {
    const forecasts = [
      { propertyId: 'p1', propertyName: 'Casa A', occupancyPercent: 20 },
      { propertyId: 'p2', propertyName: 'Casa B', occupancyPercent: 5 },
    ]
    const alerts = buildLowOccupancyAlerts(forecasts)
    expect(alerts.map((a) => a.id)).toEqual(['low-occupancy-p2', 'low-occupancy-p1'])
  })

  it('nunca gera mensagem genérica — sempre identifica o imóvel pelo nome', () => {
    const forecasts = [{ propertyId: 'p1', propertyName: 'Villa Sunset', occupancyPercent: 10 }]
    const alerts = buildLowOccupancyAlerts(forecasts)
    expect(alerts[0].message).toMatch(/Villa Sunset/)
  })
})
