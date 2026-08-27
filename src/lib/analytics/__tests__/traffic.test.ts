import { getTrafficSummary } from '@/lib/analytics/traffic'

describe('getTrafficSummary', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-08-24T12:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('aggregates traffic events by path, hostname and day', async () => {
    const supabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    event_name: 'page_view',
                    path: '/p/villa',
                    hostname: 'villa.lodgra.io',
                    referrer: null,
                    created_at: '2026-08-24T10:00:00.000Z',
                  },
                  {
                    event_name: 'page_view',
                    path: '/p/villa',
                    hostname: 'villa.lodgra.io',
                    referrer: null,
                    created_at: '2026-08-24T11:00:00.000Z',
                  },
                  {
                    event_name: 'page_view',
                    path: '/booking',
                    hostname: 'villa.lodgra.io',
                    referrer: null,
                    created_at: '2026-08-23T12:00:00.000Z',
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    }

    const summary = await getTrafficSummary(supabase as never, 'org-1', 30)

    expect(summary.totalEvents).toBe(3)
    expect(summary.pageViews30d).toBe(3)
    expect(summary.uniquePaths).toBe(2)
    expect(summary.topPaths[0]).toEqual({ path: '/p/villa', views: 2 })
    expect(summary.topHostnames[0]?.hostname).toBe('villa.lodgra.io')
  })
})
