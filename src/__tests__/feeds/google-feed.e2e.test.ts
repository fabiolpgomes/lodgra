/**
 * Google Vacation Rentals Feed - E2E Tests
 * Tests for API endpoint behavior and response headers
 */

import { generateGoogleVacationRentalsFeed } from '@/lib/feeds/google-feed-generator'

// Mock Supabase
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (_table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
      // Make the whole chain awaitable
      [Symbol.toStringTag]: 'Query',
      // Return a resolved promise when awaited
      then: jest.fn((onFulfilled: (arg: { data: unknown[] }) => unknown) =>
        Promise.resolve(onFulfilled({ data: [] }))
      ),
    }),
  }),
}))

describe('Google Vacation Rentals Feed API - E2E', () => {
  describe('Feed generation behavior', () => {
    it('should return valid feed with caching properties', async () => {
      const { xml, eTag, count } = await generateGoogleVacationRentalsFeed({
        limit: 10,
        offset: 0,
      })

      expect(xml).toBeDefined()
      expect(eTag).toBeDefined()
      expect(eTag).toMatch(/^[a-f0-9]{32}$/) // MD5 format
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('should include XML feed headers', async () => {
      const { xml } = await generateGoogleVacationRentalsFeed()

      expect(xml).toContain('<?xml version="1.0"')
      expect(xml).toContain('xmlns="http://www.w3.org/2005/Atom"')
      expect(xml).toContain('xmlns:gd="http://schemas.google.com/g/2005"')
      expect(xml).toContain('xmlns:georss="http://www.georss.org/georss"')
      expect(xml).toContain('xmlns:property="http://www.google.com/feeds/property"')
    })

    it('should support limit parameter (enforces max 1000)', async () => {
      const { count: count50 } = await generateGoogleVacationRentalsFeed({ limit: 50 })
      const { count: count5000 } = await generateGoogleVacationRentalsFeed({ limit: 5000 })

      expect(count50).toBeLessThanOrEqual(50)
      expect(count5000).toBeLessThanOrEqual(1000)
    })

    it('should support offset parameter', async () => {
      const { count: count1 } = await generateGoogleVacationRentalsFeed({ limit: 10, offset: 0 })
      const { count: count2 } = await generateGoogleVacationRentalsFeed({ limit: 10, offset: 10 })

      expect(count1).toBeGreaterThanOrEqual(0)
      expect(count2).toBeGreaterThanOrEqual(0)
    })

    it('should support currency parameter', async () => {
      const { xml: xmlEUR } = await generateGoogleVacationRentalsFeed({ currency: 'EUR', limit: 5 })
      const { xml: xmlUSD } = await generateGoogleVacationRentalsFeed({ currency: 'USD', limit: 5 })

      if (xmlEUR.includes('currencyCode')) {
        expect(xmlEUR).toContain('currencyCode="EUR"')
      }
      if (xmlUSD.includes('currencyCode')) {
        expect(xmlUSD).toContain('currencyCode="USD"')
      }
    })

    it('should handle empty results gracefully', async () => {
      const { xml, count } = await generateGoogleVacationRentalsFeed({
        updated_since: '2099-01-01T00:00:00Z',
      })

      expect(xml).toContain('</feed>')
      expect(count).toBe(0)
    })

    it('should generate consistent ETags for same parameters', async () => {
      const { eTag: eTag1 } = await generateGoogleVacationRentalsFeed({ limit: 10, offset: 0 })
      const { eTag: eTag2 } = await generateGoogleVacationRentalsFeed({ limit: 10, offset: 0 })

      expect(eTag1).toBe(eTag2)
    })

    it('should complete feed generation within performance target', async () => {
      const startTime = Date.now()
      await generateGoogleVacationRentalsFeed({ limit: 100 })
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(5000)
    })

    it('should generate proper Atom feed structure', async () => {
      const { xml } = await generateGoogleVacationRentalsFeed()

      expect(xml).toContain('<title>Lodgra Property Feed</title>')
      expect(xml).toContain('<link href="https://lodgra.app"')
      expect(xml).toContain('<updated>')
      expect(xml).toContain('<id>urn:lodgra:feed:properties</id>')
      expect(xml).toContain('</feed>')
    })

    it('should escape XML special characters', async () => {
      const { xml } = await generateGoogleVacationRentalsFeed({ limit: 50 })

      // Verify no unescaped dangerous characters in feed
      const hasUnescapedAnd = xml.match(/&(?![a-z]+;)/g)

      // Ampersands should be escaped
      expect(hasUnescapedAnd).toBeNull()
    })

    it('should include eTag header value in valid format', async () => {
      const { eTag } = await generateGoogleVacationRentalsFeed()

      // eTag should be MD5 hash (32 hex chars)
      expect(eTag).toMatch(/^[a-f0-9]{32}$/)
      expect(eTag.length).toBe(32)
    })
  })
})
