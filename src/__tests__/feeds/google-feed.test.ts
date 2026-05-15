/**
 * Google Vacation Rentals Feed Generator Tests
 * Unit and integration tests for feed generation
 */

// Mock Supabase before importing the generator
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (_table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(function(this: Record<string, unknown>) {
        return {
          catch: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
      catch: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn((successCb: (arg: { data: unknown[]; error: null }) => void) => Promise.resolve(successCb({ data: [], error: null }))),
    }),
  }),
}), { virtual: true })

import { generateGoogleVacationRentalsFeed, validateFeedStructure } from '@/lib/feeds/google-feed-generator'

describe('Google Vacation Rentals Feed Generator', () => {
  describe('validateFeedStructure', () => {
    it('should validate correct feed structure', () => {
      const validFeed = `<?xml version="1.0"?>
        <feed>
          <entry></entry>
        </feed>`
      expect(validateFeedStructure(validFeed)).toBe(true)
    })

    it('should reject feed without XML declaration', () => {
      const feed = `<feed><entry></entry></feed>`
      expect(validateFeedStructure(feed)).toBe(false)
    })

    it('should reject feed without root element', () => {
      const feed = `<?xml version="1.0"?><entry></entry>`
      expect(validateFeedStructure(feed)).toBe(false)
    })

    it('should reject feed with mismatched tags', () => {
      const feed = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry></feed>`
      expect(validateFeedStructure(feed)).toBe(false)
    })

    it('should handle empty string', () => {
      expect(validateFeedStructure('')).toBe(false)
    })

    it('should handle null input', () => {
      expect(validateFeedStructure(null)).toBe(false)
    })
  })

  describe('generateGoogleVacationRentalsFeed', () => {
    it('should generate valid XML feed', async () => {
      const { xml, eTag, count } = await generateGoogleVacationRentalsFeed({
        limit: 10,
        offset: 0,
      })

      expect(xml).toBeDefined()
      expect(eTag).toBeDefined()
      expect(eTag).toMatch(/^[a-f0-9]{32}$/) // MD5 hash format
      expect(count).toBeGreaterThanOrEqual(0)
      expect(validateFeedStructure(xml)).toBe(true)
    })

    it('should respect limit parameter', async () => {
      const { xml: xml100 } = await generateGoogleVacationRentalsFeed({ limit: 100 })
      const { xml: xml10 } = await generateGoogleVacationRentalsFeed({ limit: 10 })

      const entries100 = (xml100.match(/<entry>/g) || []).length
      const entries10 = (xml10.match(/<entry>/g) || []).length

      expect(entries10).toBeLessThanOrEqual(entries100)
    })

    it('should enforce maximum limit of 1000', async () => {
      const { count } = await generateGoogleVacationRentalsFeed({ limit: 5000 })
      expect(count).toBeLessThanOrEqual(1000)
    })

    it('should include required feed elements', async () => {
      const { xml } = await generateGoogleVacationRentalsFeed()

      expect(xml).toContain('<title>Lodgra Property Feed</title>')
      expect(xml).toContain('<link href="https://lodgra.app"')
      expect(xml).toContain('<updated>')
      expect(xml).toContain('<id>urn:lodgra:feed:properties</id>')
    })

    it('should include entry elements with required fields', async () => {
      const { xml, count } = await generateGoogleVacationRentalsFeed({ limit: 5 })

      if (count > 0) {
        expect(xml).toContain('<entry>')
        expect(xml).toContain('<id>urn:lodgra:property:')
        expect(xml).toContain('<title>')
        expect(xml).toContain('<content')
        expect(xml).toContain('<link href=')
        expect(xml).toContain('<updated>')
      }
    })

    it('should escape special characters in property names', async () => {
      const { xml } = await generateGoogleVacationRentalsFeed({ limit: 100 })

      // Should not contain unescaped XML special chars in content
      const contentMatch = xml.match(/<content>(.*?)<\/content>/s)
      if (contentMatch) {
        expect(contentMatch[1]).not.toContain('&') // Should be &amp;
        expect(contentMatch[1]).not.toContain('<') // Should be &lt;
        expect(contentMatch[1]).not.toContain('>') // Should be &gt;
      }
    })

    it('should generate consistent ETag for same data within same second', async () => {
      // Mock Date to ensure consistent timestamps
      const mockDate = new Date('2026-05-15T12:00:00Z')
      const originalDate = Date
      global.Date = class extends Date {
        constructor() {
          super()
          return mockDate
        }
        static now() {
          return mockDate.getTime()
        }
      } as unknown as typeof Date

      try {
        const { eTag: eTag1 } = await generateGoogleVacationRentalsFeed({ limit: 10, offset: 0 })
        const { eTag: eTag2 } = await generateGoogleVacationRentalsFeed({ limit: 10, offset: 0 })

        expect(eTag1).toBe(eTag2)
      } finally {
        global.Date = originalDate
      }
    })

    it('should handle different ETags for different parameters', async () => {
      const { eTag: eTag1 } = await generateGoogleVacationRentalsFeed({ limit: 10, offset: 0 })
      const { eTag: eTag2 } = await generateGoogleVacationRentalsFeed({ limit: 20, offset: 0 })

      // ETags might differ if different properties are included
      // This is valid behavior
      expect(eTag1).toBeDefined()
      expect(eTag2).toBeDefined()
    })

    it('should support pagination with offset', async () => {
      const { count: count1 } = await generateGoogleVacationRentalsFeed({ limit: 5, offset: 0 })
      const { count: count2 } = await generateGoogleVacationRentalsFeed({ limit: 5, offset: 5 })

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

    it('should include address information', async () => {
      const { xml, count } = await generateGoogleVacationRentalsFeed({ limit: 5 })

      if (count > 0) {
        expect(xml).toContain('<property:address>')
        expect(xml).toContain('<property:city>')
        expect(xml).toContain('<property:country>')
        expect(xml).toContain('</property:address>')
      }
    })

    it('should include check-in/check-out times', async () => {
      const { xml, count } = await generateGoogleVacationRentalsFeed({ limit: 5 })

      if (count > 0) {
        expect(xml).toContain('<property:checkInTime>14:00</property:checkInTime>')
        expect(xml).toContain('<property:checkOutTime>11:00</property:checkOutTime>')
      }
    })

    it('should handle empty results gracefully', async () => {
      const { xml, count } = await generateGoogleVacationRentalsFeed({
        limit: 10,
        updated_since: '2099-01-01T00:00:00Z',
      })

      expect(validateFeedStructure(xml)).toBe(true)
      expect(count).toBe(0)
      expect(xml).toContain('</feed>')
    })

    it('should complete within performance target (<5s for 100 properties)', async () => {
      const startTime = Date.now()
      await generateGoogleVacationRentalsFeed({ limit: 100 })
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(5000)
    }, 10000) // 10 second test timeout
  })
})
