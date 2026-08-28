import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  checkPasswordReset,
  checkSubscriptionAndRole,
  isPublicPath,
} from '@/lib/middleware/auth-guard'
import { getCachedProfile } from '@/lib/cache/profileCache'
import { getCachedSubscriptionStatus } from '@/lib/cache/subscriptionCache'

jest.mock('next/server', () => ({
  NextRequest: class {
    constructor(public url: string | URL) {}
  },
  NextResponse: {
    redirect: jest.fn((url: string | URL) => ({
      status: 307,
      headers: new Headers({ location: url.toString() }),
    })),
  },
}))

jest.mock('@/lib/cache/profileCache', () => ({
  getCachedProfile: jest.fn(),
  setCachedProfile: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/cache/subscriptionCache', () => ({
  getCachedSubscriptionStatus: jest.fn().mockResolvedValue(null),
  setCachedSubscriptionStatus: jest.fn().mockResolvedValue(undefined),
}))

function request(pathname: string): NextRequest {
  return new NextRequest(`https://app.lodgra.com${pathname}`)
}

function passwordResetClient(profile: Record<string, unknown>): SupabaseClient {
  const single = jest.fn().mockResolvedValue({ data: profile })
  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  const from = jest.fn().mockReturnValue({ select })

  return { from } as unknown as SupabaseClient
}

describe('auth guard for cleaner collaborators', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each(['/cleaner/request-link', '/pt-BR/cleaner/dashboard'])(
    'treats %s as a public cleaner route',
    pathname => {
      expect(isPublicPath(pathname)).toBe(true)
    },
  )

  it('does not force cleaners into the SaaS password reset flow', async () => {
    const response = await checkPasswordReset(
      request('/pt/dashboard'),
      passwordResetClient({ password_reset_required: true, guest_type: 'cleaner' }),
      'cleaner-user',
    )

    expect(response).toBeNull()
  })

  it('keeps password reset enforcement for regular users', async () => {
    const response = await checkPasswordReset(
      request('/pt/dashboard'),
      passwordResetClient({ password_reset_required: true, guest_type: null }),
      'regular-user',
    )

    expect(response?.headers.get('location')).toBe('https://app.lodgra.com/auth/change-password')
  })

  it('redirects a cleaner before querying properties or subscriptions', async () => {
    ;(getCachedProfile as jest.Mock).mockResolvedValue({
      role: 'guest',
      guest_type: 'cleaner',
      organization_id: 'org-algarve-home-stay',
      access_all_properties: false,
    })
    const from = jest.fn()

    const response = await checkSubscriptionAndRole(
      request('/pt/dashboard'),
      { from } as unknown as SupabaseClient,
      'cleaner-user',
      '/pt/dashboard',
    )

    expect(response?.headers.get('location')).toBe('https://app.lodgra.com/cleaner/request-link')
    expect(from).not.toHaveBeenCalled()
  })

  it('does not send authenticated users with organization to onboarding just because there are no properties', async () => {
    ;(getCachedProfile as jest.Mock).mockResolvedValue({
      role: 'viewer',
      guest_type: null,
      organization_id: 'org-algarve-home-stay',
      access_all_properties: false,
    })
    ;(getCachedSubscriptionStatus as jest.Mock).mockResolvedValue('active')

    const from = jest.fn((table: string) => {
      if (table === 'user_profiles') {
        const single = jest.fn().mockResolvedValue({
          data: {
            role: 'viewer',
            access_all_properties: false,
            organization_id: 'org-algarve-home-stay',
            guest_type: null,
          },
        })
        const eq = jest.fn().mockReturnValue({ single })
        const select = jest.fn().mockReturnValue({ eq })
        return { select }
      }

      return {}
    })

    const response = await checkSubscriptionAndRole(
      request('/pt/dashboard'),
      { from } as unknown as SupabaseClient,
      'viewer-user',
      '/pt/dashboard',
    )

    expect(response).toBeNull()
    expect(from).not.toHaveBeenCalledWith('properties')
  })
})
