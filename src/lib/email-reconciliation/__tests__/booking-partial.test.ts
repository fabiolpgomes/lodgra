import { chooseBookingAnchor, isBookingPartialConfirmation, listingNameOverlap } from '../booking-partial'

const block = (id: string, property_name: string, raw_summary = 'CLOSED - Not available') => ({
  id, check_in: '2026-10-03', check_out: '2026-10-07', raw_summary, property_name,
})

describe('Booking partial confirmations', () => {
  it('recognises the code + check-in only Booking e-mail', () => {
    expect(isBookingPartialConfirmation({ source_platform: 'booking', check_in: '2026-10-03', check_out: null, reservation_code: '5159950202' })).toBe(true)
    expect(isBookingPartialConfirmation({ source_platform: 'booking', check_in: '2026-10-03', check_out: null, reservation_code: null })).toBe(false)
    expect(isBookingPartialConfirmation({ source_platform: 'airbnb', check_in: '2026-10-03', check_out: null, reservation_code: 'HM1' })).toBe(false)
    expect(isBookingPartialConfirmation({ source_platform: 'booking', check_in: '2026-10-03', check_out: '2026-10-07', reservation_code: '1' })).toBe(false)
  })

  it('matches listing titles that differ in wording', () => {
    expect(listingNameOverlap('AHS - T1 Armação de Pêra, varanda, piscina e garagem', 'AHS - T1 em Armação de Pêra | Piscina + Garagem')).toBeGreaterThanOrEqual(0.5)
    expect(listingNameOverlap('AHS - T1 Armação de Pêra, varanda, piscina e garagem', 'AHS Premium Apart 2 Pools | PS4 | 5 min Beach Algarve')).toBeLessThan(0.5)
  })

  it('anchors on the only block of the e-mail listing that starts on the check-in day', () => {
    const decision = chooseBookingAnchor('AHS - T1 Armação de Pêra, varanda, piscina e garagem', [
      block('t1', 'AHS - T1 em Armação de Pêra | Piscina + Garagem'),
      block('premium', 'AHS Premium Apart 2 Pools | PS4 | 5 min Beach Algarve'),
    ])
    expect(decision).toMatchObject({ status: 'matched', event: { id: 't1', check_out: '2026-10-07' } })
  })

  it('never anchors on a block of another property', () => {
    expect(chooseBookingAnchor('AHS - T1 Armação de Pêra, varanda, piscina e garagem', [
      block('premium', 'AHS Premium Apart 2 Pools | PS4 | 5 min Beach Algarve'),
    ])).toMatchObject({ status: 'needs_review' })
  })

  it('sends ties between similar listings to review', () => {
    expect(chooseBookingAnchor('AHS Premium Apart 2 Pools', [
      block('a', 'AHS Premium Apart 2 Pools A'), block('b', 'AHS Premium Apart 2 Pools B'),
    ])).toMatchObject({ status: 'needs_review' })
  })

  it('ignores blocks that already carry guest details and reports no match without blocks', () => {
    expect(chooseBookingAnchor('AHS - T1 Armação de Pêra', [block('t1', 'AHS - T1 Armação de Pêra', 'Ana Silva')])).toMatchObject({ status: 'no_match' })
    expect(chooseBookingAnchor('AHS - T1 Armação de Pêra', [])).toMatchObject({ status: 'no_match' })
  })
})
