import {
  buildLoyaltyStatsUrl,
  getLoyaltyDashboardOrigin,
} from '@/lib/dashboard/loyalty'

function createHeaders(values: Record<string, string | undefined>) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null
    },
  }
}

describe('loyalty dashboard url helpers', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it('prefers forwarded host and protocol when available', () => {
    const headers = createHeaders({
      'x-forwarded-host': 'app.example.com',
      'x-forwarded-proto': 'https',
      host: 'internal.example.local',
    })

    expect(getLoyaltyDashboardOrigin(headers)).toBe('https://app.example.com')
  })

  it('uses http for localhost hosts when protocol is not forwarded', () => {
    const headers = createHeaders({
      host: 'localhost:3000',
    })

    expect(getLoyaltyDashboardOrigin(headers)).toBe('http://localhost:3000')
  })

  it('falls back to the configured app url when no host is present', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://staging.lodgra.io/'

    expect(getLoyaltyDashboardOrigin(createHeaders({}))).toBe('https://staging.lodgra.io')
  })

  it('builds the loyalty stats url from the normalized origin', () => {
    expect(buildLoyaltyStatsUrl('https://lodgra.io/')).toBe(
      'https://lodgra.io/api/dashboard/loyalty/stats'
    )
  })
})
