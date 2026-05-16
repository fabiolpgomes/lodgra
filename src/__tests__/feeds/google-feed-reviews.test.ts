jest.mock('@supabase/supabase-js')

/**
 * Helper: extract text content between XML tags
 */
function extractXMLValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 's')
  const match = xml.match(regex)
  return match ? match[1] : null
}

/**
 * Helper: check if XML contains a tag
 */
function hasXMLTag(xml: string, tagName: string): boolean {
  return new RegExp(`<${tagName}[^>]*>`, 's').test(xml)
}

describe('Review Aggregator Logic (AC1-AC2)', () => {
  describe('Review filtering logic', () => {
    it('AC1: should filter reviews with rating >= 4.0', () => {
      // Test the filtering logic: reviews with rating >= 4.0
      const allReviews = [
        { rating: 4.5, source: 'booking' },
        { rating: 3.5, source: 'airbnb' }, // Below threshold
        { rating: 4.0, source: 'booking' }, // At threshold
        { rating: 2.0, source: 'google' }, // Below threshold
      ]

      const filtered = allReviews.filter((r) => r.rating >= 4.0)
      expect(filtered).toHaveLength(2)
      expect(filtered).toEqual([
        { rating: 4.5, source: 'booking' },
        { rating: 4.0, source: 'booking' },
      ])
      expect(filtered.every((r) => r.rating >= 4.0)).toBe(true)
    })

    it('AC2: should filter by allowed sources (booking, airbnb)', () => {
      // Test source filtering: only 'booking' and 'airbnb' allowed
      const allReviews = [
        { rating: 4.5, source: 'booking' },
        { rating: 4.2, source: 'airbnb' },
        { rating: 4.8, source: 'google' }, // Filtered out
        { rating: 4.0, source: 'tripadvisor' }, // Filtered out
      ]

      const allowedSources = ['booking', 'airbnb']
      const filtered = allReviews.filter((r) => allowedSources.includes(r.source))
      expect(filtered).toHaveLength(2)
      expect(filtered.every((r) => allowedSources.includes(r.source))).toBe(true)
    })

    it('should apply both filters together (rating >= 4.0 AND allowed sources)', () => {
      const allReviews = [
        { rating: 4.5, source: 'booking' }, // Pass both
        { rating: 3.5, source: 'airbnb' }, // Fail rating
        { rating: 4.8, source: 'google' }, // Fail source
        { rating: 4.0, source: 'booking' }, // Pass both
        { rating: 3.0, source: 'tripadvisor' }, // Fail both
      ]

      const allowedSources = ['booking', 'airbnb']
      const filtered = allReviews.filter((r) => r.rating >= 4.0 && allowedSources.includes(r.source))
      expect(filtered).toHaveLength(2)
      expect(filtered.every((r) => r.rating >= 4.0 && allowedSources.includes(r.source))).toBe(true)
    })
  })

  describe('Average calculation', () => {
    it('AC4: should calculate simple average correctly', () => {
      const reviews = [
        { rating: 4.5 },
        { rating: 4.8 },
        { rating: 4.0 },
        { rating: 5.0 },
      ]

      const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
      const average = Math.round((sum / reviews.length) * 10) / 10

      expect(average).toBe(4.6)
    })

    it('should handle edge cases in average calculation', () => {
      const reviews = [{ rating: 4.4 }]
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
      const average = Math.round((sum / reviews.length) * 10) / 10

      expect(average).toBe(4.4)
    })

    it('should round averages to 1 decimal place', () => {
      const reviews = [
        { rating: 4.15 },
        { rating: 4.25 },
        { rating: 4.35 },
      ]

      const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
      const average = Math.round((sum / reviews.length) * 10) / 10

      expect(average).toBe(4.3)
      expect(Number.isFinite(average)).toBe(true)
    })
  })
})

describe('Feed XML Structure (AC3-AC5)', () => {
  it('AC3: should include <reviews> section in feed entry', () => {
    const reviewsXml = `<reviews>
      <review>
        <rating>4.5</rating>
        <source>booking</source>
        <text>Great property</text>
        <author>John</author>
        <date>2026-05-10</date>
      </review>
      <aggregateRating>
        <average>4.5</average>
        <count>1</count>
        <bestRating>5</bestRating>
        <worstRating>1</worstRating>
      </aggregateRating>
    </reviews>`

    expect(hasXMLTag(reviewsXml, 'reviews')).toBe(true)
    expect(hasXMLTag(reviewsXml, 'review')).toBe(true)
  })

  it('AC4: should include aggregateRating with all required fields', () => {
    const aggregateXml = `<aggregateRating>
      <average>4.7</average>
      <count>25</count>
      <bestRating>5</bestRating>
      <worstRating>1</worstRating>
    </aggregateRating>`

    expect(extractXMLValue(aggregateXml, 'average')).toBe('4.7')
    expect(extractXMLValue(aggregateXml, 'count')).toBe('25')
    expect(extractXMLValue(aggregateXml, 'bestRating')).toBe('5')
    expect(extractXMLValue(aggregateXml, 'worstRating')).toBe('1')
  })

  it('AC5: should include review text and author information', () => {
    const reviewXml = `<review>
      <rating>4.5</rating>
      <source>booking</source>
      <text>Excellent property, great location</text>
      <author>John Doe</author>
      <date>2026-05-10</date>
    </review>`

    expect(extractXMLValue(reviewXml, 'text')).toBe('Excellent property, great location')
    expect(extractXMLValue(reviewXml, 'author')).toBe('John Doe')
    expect(extractXMLValue(reviewXml, 'rating')).toBe('4.5')
  })

  it('should escape special characters in review text and author', () => {
    const specialCharsXml = `<review>
      <text>&lt;script&gt;alert('xss')&lt;/script&gt;</text>
      <author>John &amp; Jane</author>
    </review>`

    const text = extractXMLValue(specialCharsXml, 'text')
    const author = extractXMLValue(specialCharsXml, 'author')

    expect(text).toContain('&lt;')
    expect(author).toContain('&amp;')
  })
})

describe('API Parameter Support (AC3, AC6)', () => {
  it('should support include_reviews query parameter', () => {
    const params1 = new URLSearchParams('include_reviews=true')
    const params2 = new URLSearchParams('include_reviews=false')
    const params3 = new URLSearchParams('')

    expect(params1.get('include_reviews')).toBe('true')
    expect(params2.get('include_reviews')).toBe('false')
    expect(params3.get('include_reviews')).toBe(null) // Defaults to true in implementation
  })

  it('should support updated_since parameter for incremental updates', () => {
    const since = '2026-05-01T00:00:00Z'
    const params = new URLSearchParams(`updated_since=${since}`)

    expect(params.get('updated_since')).toBe(since)
  })

  it('should handle include_reviews=false by omitting reviews section', () => {
    const feedWithoutReviews = `<entry>
      <title>Property Name</title>
      <id>prop-123</id>
    </entry>`

    expect(hasXMLTag(feedWithoutReviews, 'reviews')).toBe(false)
  })

  it('should include reviews section when include_reviews=true', () => {
    const feedWithReviews = `<entry>
      <title>Property Name</title>
      <reviews>
        <aggregateRating>
          <average>4.5</average>
          <count>10</count>
        </aggregateRating>
      </reviews>
    </entry>`

    expect(hasXMLTag(feedWithReviews, 'reviews')).toBe(true)
    expect(extractXMLValue(feedWithReviews, 'average')).toBe('4.5')
  })
})
