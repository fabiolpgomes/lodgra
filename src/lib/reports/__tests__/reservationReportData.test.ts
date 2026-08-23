import {
  escapeReportHtml,
  fetchAllReportPages,
  mapCanonicalReservationToReport,
  reservationOverlapsReport,
  truncateReportText,
} from '../reservationReportData'

describe('fetchAllReportPages', () => {
  it('combina todas as páginas até receber uma página incompleta', async () => {
    const source = Array.from({ length: 2005 }, (_, index) => index)
    const fetchPage = jest.fn(async (from: number, to: number) => source.slice(from, to + 1))

    await expect(fetchAllReportPages(fetchPage, 1000)).resolves.toEqual(source)
    expect(fetchPage.mock.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })

  it('rejeita um tamanho de página inválido', async () => {
    await expect(fetchAllReportPages(async () => [], 0))
      .rejects.toThrow('pageSize must be a positive integer')
  })
})

describe('escapeReportHtml', () => {
  it('neutraliza markup sem escapar entidades HTML já válidas novamente', () => {
    expect(escapeReportHtml('Ana &amp; João <script>"x" & y</script>'))
      .toBe('Ana &amp; João &lt;script&gt;&quot;x&quot; &amp; y&lt;/script&gt;')
  })
})

describe('truncateReportText', () => {
  it('encurta texto longo com reticências sem exceder o limite', () => {
    expect(truncateReportText('AHS - Casa do Moinho Refúgio na Natureza', 24))
      .toBe('AHS - Casa do Moinho Re…')
  })

  it('preserva texto que já cabe no limite', () => {
    expect(truncateReportText('Casa Azul', 24)).toBe('Casa Azul')
  })

  it('rejeita limite inválido', () => {
    expect(() => truncateReportText('Casa Azul', 0))
      .toThrow('maxLength must be a positive integer')
  })
})

describe('reservationOverlapsReport', () => {
  it('exclui uma reserva cujo checkout coincide com o início do relatório', () => {
    expect(reservationOverlapsReport('2026-07-25', '2026-08-01', '2026-08-01', '2026-08-31'))
      .toBe(false)
    expect(reservationOverlapsReport('2026-07-25', '2026-08-02', '2026-08-01', '2026-08-31'))
      .toBe(true)
  })
})

describe('mapCanonicalReservationToReport', () => {
  const property = {
    id: 'property-1',
    name: 'Casa Azul',
    city: 'Portimão',
    currency: 'EUR',
  }

  it('adapta o schema Multi-OTA para o contrato do relatório', () => {
    const row = mapCanonicalReservationToReport({
      id: 'reservation-1',
      property_id: property.id,
      check_in: '2026-08-01',
      check_out: '2026-08-05',
      reservation_status: 'confirmed',
      total_price: 450,
      currency: 'USD',
      number_of_guests: 3,
      adults: 2,
      children: 1,
      notes: 'Chegada tardia',
      guest_name: 'Maria Silva',
      guest_email: 'maria@example.com',
      channel_connections: { channel: 'airbnb' },
    }, property)

    expect(row).toEqual(expect.objectContaining({
      property_id: property.id,
      status: 'confirmed',
      total_amount: 450,
      currency: 'USD',
      source: 'airbnb',
      internal_notes: 'Chegada tardia',
      guests: { first_name: 'Maria Silva', last_name: '', email: 'maria@example.com' },
    }))
    expect(row.property_listings.properties).toEqual(property)
    expect(row.property_listings.platforms).toEqual({ display_name: 'airbnb' })
  })

  it('mantém fallbacks seguros quando hóspede e canal estão ausentes', () => {
    const row = mapCanonicalReservationToReport({
      id: 'reservation-2',
      property_id: property.id,
      check_in: '2026-08-10',
      check_out: '2026-08-12',
      reservation_status: 'confirmed',
      total_price: null,
      currency: null,
      number_of_guests: null,
      adults: null,
      children: null,
      notes: null,
      guest_name: null,
      guest_email: null,
      channel_connections: [],
    }, property)

    expect(row.guests).toBeNull()
    expect(row.source).toBeNull()
    expect(row.property_listings.platforms).toBeNull()
    expect(row.number_of_guests).toBe(0)
  })

  it('preserva moeda ausente quando nem reserva nem propriedade a informam', () => {
    const row = mapCanonicalReservationToReport({
      id: 'reservation-3',
      property_id: property.id,
      check_in: '2026-08-10',
      check_out: '2026-08-12',
      reservation_status: 'confirmed',
      total_price: 120,
      currency: null,
      number_of_guests: 1,
      adults: 1,
      children: 0,
      notes: null,
      guest_name: 'Ana',
      guest_email: null,
      channel_connections: null,
    }, { ...property, currency: null })

    expect(row.currency).toBeNull()
  })
})
