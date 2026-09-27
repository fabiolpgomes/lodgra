import {
  buildChannelRevenue,
  getChannelLabel,
  platformCodeForBookingSource,
  platformChargesFromSnapshot,
  CHANNEL_CONCENTRATION_THRESHOLD,
  type ChannelReservationInput,
} from '../channelRevenue'

function makeReservation(overrides: Partial<ChannelReservationInput>): ChannelReservationInput {
  return {
    bookingSource: 'airbnb',
    totalAmount: 100,
    commissionAmount: 15,
    platformDisplayName: null,
    ...overrides,
  }
}

describe('getChannelLabel', () => {
  it('usa platforms.display_name quando disponível', () => {
    expect(getChannelLabel('booking', 'Booking.com Oficial')).toBe('Booking.com Oficial')
  })

  it('ignora display_name em branco e cai no mapa estático', () => {
    expect(getChannelLabel('airbnb', '   ')).toBe('Airbnb')
  })

  it('mapeia os valores conhecidos de booking_source', () => {
    expect(getChannelLabel('manual')).toBe('Manual / Outro')
    expect(getChannelLabel('direct')).toBe('Reserva Directa')
    expect(getChannelLabel('booking_api')).toBe('Booking.com')
    expect(getChannelLabel('email_parse')).toBe('Importado via E-mail')
    expect(getChannelLabel('ical_import')).toBe('iCal (plataforma não identificada)')
  })

  it('normaliza variações de texto livre do booking_source', () => {
    expect(getChannelLabel('Booking.com')).toBe('Booking.com')
    expect(getChannelLabel('booking')).toBe('Booking.com')
    expect(getChannelLabel(' Airbnb ')).toBe('Airbnb')
    expect(getChannelLabel('Reserva Direta')).toBe('Reserva Directa')
    expect(getChannelLabel('ical')).toBe('iCal (plataforma não identificada)')
  })

  it('usa o valor bruto como fallback para canais desconhecidos', () => {
    expect(getChannelLabel('some_new_channel')).toBe('some_new_channel')
  })
})

describe('platformCodeForBookingSource', () => {
  it('deduz o código da plataforma a partir do booking_source', () => {
    expect(platformCodeForBookingSource('Booking.com')).toBe('BOOKING')
    expect(platformCodeForBookingSource('booking')).toBe('BOOKING')
    expect(platformCodeForBookingSource('Airbnb')).toBe('AIRBNB')
    expect(platformCodeForBookingSource('Reserva Direta')).toBe('DIRECT')
    expect(platformCodeForBookingSource('manual')).toBe('MANUAL')
  })

  it('retorna null para origens sem plataforma', () => {
    expect(platformCodeForBookingSource('ical')).toBeNull()
    expect(platformCodeForBookingSource('Flatio')).toBeNull()
    expect(platformCodeForBookingSource(null)).toBeNull()
  })
})

describe('platformChargesFromSnapshot', () => {
  it('soma Comissão OTA + Processamento de pagamento (Booking.com 27,71 + 2,16)', () => {
    expect(platformChargesFromSnapshot({ ota_commission_amount: '27.71', payment_processing_fee_amount: '2.16' })).toBe(29.87)
  })

  it('usa só o campo preenchido quando o outro está vazio', () => {
    expect(platformChargesFromSnapshot({ ota_commission_amount: 27.71, payment_processing_fee_amount: null })).toBe(27.71)
    expect(platformChargesFromSnapshot({ ota_commission_amount: null, payment_processing_fee_amount: '2.16' })).toBe(2.16)
  })

  it('devolve null quando nenhum valor foi informado', () => {
    expect(platformChargesFromSnapshot({ ota_commission_amount: null, payment_processing_fee_amount: null })).toBeNull()
  })
})

describe('buildChannelRevenue', () => {
  it('comissão da plataforma fica null quando nenhuma reserva do canal tem o dado (iCal)', () => {
    const result = buildChannelRevenue([
      makeReservation({ bookingSource: 'airbnb', totalAmount: 500, commissionAmount: null }),
      makeReservation({ bookingSource: 'airbnb', totalAmount: 300, commissionAmount: undefined }),
      makeReservation({ bookingSource: 'booking', totalAmount: 200, commissionAmount: null }),
      makeReservation({ bookingSource: 'booking', totalAmount: 100, commissionAmount: 12 }),
    ])
    expect(result.channels.find((c) => c.channel === 'airbnb')?.commissionAmount).toBeNull()
    expect(result.channels.find((c) => c.channel === 'booking')?.commissionAmount).toBe(12)
  })

  it('CHANNEL_CONCENTRATION_THRESHOLD é 60', () => {
    expect(CHANNEL_CONCENTRATION_THRESHOLD).toBe(60)
  })

  it('caso 1: canal dominante > 60% da receita dispara o alerta de concentração', () => {
    const reservations = [
      makeReservation({ bookingSource: 'airbnb', totalAmount: 700, commissionAmount: 100 }),
      makeReservation({ bookingSource: 'booking', totalAmount: 200, commissionAmount: 20 }),
      makeReservation({ bookingSource: 'direct', totalAmount: 100, commissionAmount: 0 }),
    ]

    const result = buildChannelRevenue(reservations)

    expect(result.totalRevenue).toBe(1000)
    expect(result.totalReservations).toBe(3)
    expect(result.excludedCount).toBe(0)

    const airbnb = result.channels.find(c => c.channel === 'airbnb')
    expect(airbnb?.revenuePercent).toBeCloseTo(70)
    expect(airbnb?.reservationPercent).toBeCloseTo(100 / 3)
    expect(airbnb?.commissionAmount).toBe(100)

    expect(result.concentrationAlert).not.toBeNull()
    expect(result.concentrationAlert?.channel).toBe('airbnb')
    expect(result.concentrationAlert?.revenuePercent).toBeCloseTo(70)
  })

  it('caso 2: distribuição equilibrada não dispara alerta de concentração', () => {
    const reservations = [
      makeReservation({ bookingSource: 'airbnb', totalAmount: 400, commissionAmount: 40 }),
      makeReservation({ bookingSource: 'booking', totalAmount: 350, commissionAmount: 35 }),
      makeReservation({ bookingSource: 'direct', totalAmount: 250, commissionAmount: 0 }),
    ]

    const result = buildChannelRevenue(reservations)

    const dominant = result.channels[0]
    expect(dominant.revenuePercent).toBeLessThanOrEqual(60)
    expect(result.concentrationAlert).toBeNull()
  })

  it('exatamente no limiar (60%) NÃO dispara o alerta — só dispara acima de 60%', () => {
    const reservations = [
      makeReservation({ bookingSource: 'airbnb', totalAmount: 600 }),
      makeReservation({ bookingSource: 'booking', totalAmount: 400 }),
    ]

    const result = buildChannelRevenue(reservations)
    const airbnb = result.channels.find(c => c.channel === 'airbnb')
    expect(airbnb?.revenuePercent).toBeCloseTo(60)
    expect(result.concentrationAlert).toBeNull()
  })

  it('caso 3: reservas com booking_source ausente são excluídas e contadas separadamente, nunca somadas a um canal "desconhecido"', () => {
    const reservations = [
      makeReservation({ bookingSource: 'airbnb', totalAmount: 500 }),
      makeReservation({ bookingSource: null, totalAmount: 300 }),
      makeReservation({ bookingSource: undefined, totalAmount: 200 }),
    ]

    const result = buildChannelRevenue(reservations)

    expect(result.totalRevenue).toBe(500)
    expect(result.totalReservations).toBe(1)
    expect(result.excludedCount).toBe(2)
    expect(result.channels).toHaveLength(1)
    expect(result.channels[0].channel).toBe('airbnb')
    expect(result.channels[0].revenuePercent).toBeCloseTo(100)
    // Nenhum canal "desconhecido"/"unknown" deve aparecer no breakdown.
    expect(result.channels.some(c => c.channel === 'unknown' || c.channel === 'desconhecido')).toBe(false)
  })

  it('reservas com total_amount ausente são excluídas e contadas separadamente', () => {
    const reservations = [
      makeReservation({ bookingSource: 'airbnb', totalAmount: 500 }),
      makeReservation({ bookingSource: 'booking', totalAmount: null }),
      makeReservation({ bookingSource: 'direct', totalAmount: undefined }),
    ]

    const result = buildChannelRevenue(reservations)

    expect(result.totalRevenue).toBe(500)
    expect(result.totalReservations).toBe(1)
    expect(result.excludedCount).toBe(2)
  })

  it('total_amount = 0 é um valor real e NÃO é excluído (só null/undefined são excluídos)', () => {
    const reservations = [
      makeReservation({ bookingSource: 'airbnb', totalAmount: 500 }),
      makeReservation({ bookingSource: 'direct', totalAmount: 0 }),
    ]

    const result = buildChannelRevenue(reservations)

    expect(result.totalReservations).toBe(2)
    expect(result.excludedCount).toBe(0)
    const direct = result.channels.find(c => c.channel === 'direct')
    expect(direct).toBeDefined()
    expect(direct?.revenueAmount).toBe(0)
  })

  it('soma commission_amount real por canal, tratando ausência como 0 (nunca estima por taxa fixa)', () => {
    const reservations = [
      makeReservation({ bookingSource: 'airbnb', totalAmount: 100, commissionAmount: 15 }),
      makeReservation({ bookingSource: 'airbnb', totalAmount: 100, commissionAmount: null }),
      makeReservation({ bookingSource: 'airbnb', totalAmount: 100, commissionAmount: undefined }),
    ]

    const result = buildChannelRevenue(reservations)
    const airbnb = result.channels.find(c => c.channel === 'airbnb')
    expect(airbnb?.commissionAmount).toBe(15)
  })

  it('lista vazia não quebra e não dispara alerta', () => {
    const result = buildChannelRevenue([])
    expect(result.channels).toEqual([])
    expect(result.totalRevenue).toBe(0)
    expect(result.totalReservations).toBe(0)
    expect(result.excludedCount).toBe(0)
    expect(result.concentrationAlert).toBeNull()
  })

  it('respeita um threshold customizado passado explicitamente', () => {
    const reservations = [
      makeReservation({ bookingSource: 'airbnb', totalAmount: 550 }),
      makeReservation({ bookingSource: 'booking', totalAmount: 450 }),
    ]

    const result = buildChannelRevenue(reservations, 50)
    expect(result.concentrationAlert?.channel).toBe('airbnb')
    expect(result.concentrationAlert?.revenuePercent).toBeCloseTo(55)
  })

  it('usa platforms.display_name como rótulo quando presente na reserva', () => {
    const reservations = [
      makeReservation({ bookingSource: 'booking', totalAmount: 100, platformDisplayName: 'Booking.com PT' }),
    ]
    const result = buildChannelRevenue(reservations)
    expect(result.channels[0].label).toBe('Booking.com PT')
  })

  it('funde bookingSource diferentes que resolvem para o mesmo rótulo (regressão — bug reportado em produção 2026-07-23: "Airbnb" aparecia 2x)', () => {
    // Reproduz o cenário real: sync-ical grava booking_source='airbnb' quando
    // detecta a plataforma, mas cai para 'ical_import' quando não detecta —
    // mesmo sendo, de fato, uma reserva do Airbnb (confirmado via
    // platforms.display_name). Agrupar pelo valor bruto duplicava a linha
    // "Airbnb" no card; agrupar pelo rótulo resolvido funde numa linha só.
    const reservations = [
      makeReservation({ bookingSource: 'airbnb', totalAmount: 300, commissionAmount: 45, platformDisplayName: null }),
      makeReservation({ bookingSource: 'ical_import', totalAmount: 200, commissionAmount: 30, platformDisplayName: 'Airbnb' }),
      makeReservation({ bookingSource: 'booking', totalAmount: 100, commissionAmount: 10, platformDisplayName: null }),
    ]

    const result = buildChannelRevenue(reservations)

    const airbnbRows = result.channels.filter(c => c.label === 'Airbnb')
    expect(airbnbRows).toHaveLength(1)
    expect(airbnbRows[0].revenueAmount).toBe(500)
    expect(airbnbRows[0].reservationCount).toBe(2)
    expect(airbnbRows[0].commissionAmount).toBe(75)
    expect(result.channels).toHaveLength(2) // Airbnb (fundido) + Booking.com
  })
})
