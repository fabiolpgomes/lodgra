import { ruleForDate } from '@/lib/pricing/getPriceForRange'

const makeRule = (
  overrides: Partial<{
    id: string
    name: string
    start_date: string
    end_date: string
    price_per_night: number
    min_nights: number
    created_at: string
  }> = {}
) => ({
  id: 'rule-1',
  name: 'Test Rule',
  start_date: '2026-07-01',
  end_date: '2026-08-31',
  price_per_night: 150,
  min_nights: 3,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('ruleForDate', () => {
  it('returns null when no rules exist', () => {
    expect(ruleForDate([], new Date('2026-07-15'))).toBeNull()
  })

  it('returns null when date is before rule start', () => {
    const rule = makeRule({ start_date: '2026-07-01', end_date: '2026-07-31' })
    expect(ruleForDate([rule], new Date('2026-06-30'))).toBeNull()
  })

  it('returns null when date is after rule end', () => {
    const rule = makeRule({ start_date: '2026-07-01', end_date: '2026-07-31' })
    expect(ruleForDate([rule], new Date('2026-08-01'))).toBeNull()
  })

  it('returns the rule when date is within range', () => {
    const rule = makeRule({ start_date: '2026-07-01', end_date: '2026-07-31', price_per_night: 150 })
    const result = ruleForDate([rule], new Date('2026-07-15'))
    expect(result).not.toBeNull()
    expect(result?.price_per_night).toBe(150)
  })

  it('returns rule on exact start_date boundary', () => {
    const rule = makeRule({ start_date: '2026-07-01', end_date: '2026-07-31' })
    expect(ruleForDate([rule], new Date('2026-07-01'))).not.toBeNull()
  })

  it('returns rule on exact end_date boundary', () => {
    const rule = makeRule({ start_date: '2026-07-01', end_date: '2026-07-31' })
    expect(ruleForDate([rule], new Date('2026-07-31'))).not.toBeNull()
  })

  it('returns the most recently created rule when two rules overlap', () => {
    const older = makeRule({
      id: 'rule-old',
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      price_per_night: 100,
      created_at: '2026-01-01T00:00:00Z',
    })
    const newer = makeRule({
      id: 'rule-new',
      start_date: '2026-07-10',
      end_date: '2026-07-20',
      price_per_night: 200,
      created_at: '2026-02-01T00:00:00Z',
    })
    // Date within both rules' range
    const result = ruleForDate([older, newer], new Date('2026-07-15'))
    expect(result?.id).toBe('rule-new')
    expect(result?.price_per_night).toBe(200)
  })

  it('returns the only applicable rule when non-overlapping rules exist', () => {
    const julyRule = makeRule({
      id: 'july',
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      price_per_night: 150,
    })
    const augustRule = makeRule({
      id: 'august',
      start_date: '2026-08-01',
      end_date: '2026-08-31',
      price_per_night: 180,
    })
    expect(ruleForDate([julyRule, augustRule], new Date('2026-07-15'))?.id).toBe('july')
    expect(ruleForDate([julyRule, augustRule], new Date('2026-08-10'))?.id).toBe('august')
    expect(ruleForDate([julyRule, augustRule], new Date('2026-09-01'))).toBeNull()
  })
})
