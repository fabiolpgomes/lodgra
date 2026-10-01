import { GET } from '../route'
import { requireRole } from '@/lib/auth/requireRole'
import { refreshConnectStatus } from '@/lib/stripe/connect'
import { isPlatformStripeConfigured } from '@/lib/stripe/platform'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/auth/requireRole')
jest.mock('@/lib/stripe/platform')
jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/stripe/connect', () => ({
  ...jest.requireActual('@/lib/stripe/connect'),
  refreshConnectStatus: jest.fn(),
}))

function mockOrgCurrency(currency: string | null) {
  ;(createAdminClient as jest.Mock).mockReturnValue({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { billing_currency: currency } }) }) }) }),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, organizationId: 'org-1' })
  ;(refreshConnectStatus as jest.Mock).mockResolvedValue({ accountId: null, platform: null, status: 'none', detailsSubmitted: false })
  ;(isPlatformStripeConfigured as jest.Mock).mockReturnValue(true)
})

describe('GET /api/stripe/connect — país sugerido', () => {
  it('organização em EUR sugere Portugal', async () => {
    mockOrgCurrency('eur')
    const body = await (await GET()).json()
    expect(body.defaultCountry).toBe('PT')
  })

  it('organização em BRL sugere Brasil', async () => {
    mockOrgCurrency('brl')
    const body = await (await GET()).json()
    expect(body.defaultCountry).toBe('BR')
  })

  it('sem moeda definida usa o primeiro país disponível', async () => {
    mockOrgCurrency(null)
    const body = await (await GET()).json()
    expect(body.defaultCountry).toBe(body.countries[0].code)
  })

  it('não sugere um país cuja plataforma não está configurada', async () => {
    mockOrgCurrency('eur')
    ;(isPlatformStripeConfigured as jest.Mock).mockImplementation((p: string) => p === 'brl')
    const body = await (await GET()).json()
    expect(body.defaultCountry).toBe('BR')
  })
})
