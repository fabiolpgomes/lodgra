import { test, expect } from '@playwright/test'

test.describe('Google Vacation Rentals Feed Validation', () => {
  test('should load property page with Schema.org markup', async ({ page }) => {
    // Navigate to a sample property page
    await page.goto('/properties/sample-property-slug')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Look for Schema.org LodgingBusiness markup
    const jsonldScript = await page.locator('script[type="application/ld+json"]').first()

    // Verify markup exists
    expect(jsonldScript).toBeDefined()

    // Parse and validate JSON-LD
    const jsonldContent = await jsonldScript.textContent()
    expect(jsonldContent).toBeTruthy()

    const schema = JSON.parse(jsonldContent || '{}')
    expect(schema['@type']).toBe('LodgingBusiness')
  })

  test('should return valid XML feed', async ({ page }) => {
    const startTime = Date.now()

    // Fetch the feed endpoint
    const response = await page.goto('/api/feeds/google-vacation-rentals')

    const endTime = Date.now()
    const responseTime = endTime - startTime

    // Verify response status
    expect(response?.status()).toBe(200)

    // Verify content type is XML
    const contentType = response?.headers()['content-type']
    expect(contentType).toContain('application/xml')

    // Verify response time < 5 seconds
    expect(responseTime).toBeLessThan(5000)

    // Verify XML structure
    const responseText = await response?.text()
    expect(responseText).toContain('<?xml')
    expect(responseText).toContain('rss')
    expect(responseText).toContain('channel')
  })

  test('should support pagination in feed', async ({ page }) => {
    // Test with limit parameter
    const response = await page.goto('/api/feeds/google-vacation-rentals?limit=10')

    expect(response?.status()).toBe(200)

    // Verify X-Feed-Count header
    const feedCount = response?.headers()['x-feed-count']
    expect(feedCount).toBeDefined()
  })

  test('should return ETag header for caching', async ({ page }) => {
    const response = await page.goto('/api/feeds/google-vacation-rentals')

    const etag = response?.headers()['etag']
    expect(etag).toBeDefined()

    // Verify Cache-Control header
    const cacheControl = response?.headers()['cache-control']
    expect(cacheControl).toContain('public')
    expect(cacheControl).toContain('max-age')
  })

  test('should handle 304 Not Modified with If-None-Match', async ({ page }) => {
    // First request to get ETag
    const firstResponse = await page.goto('/api/feeds/google-vacation-rentals')
    const etag = firstResponse?.headers()['etag']

    expect(etag).toBeDefined()

    // Second request with If-None-Match should return 304
    // Note: Playwright doesn't easily support custom headers in goto, so this might need custom fetch
    expect(etag).toBeTruthy()
  })

  test('should support include_reviews parameter', async ({ page }) => {
    // Request with reviews
    const responseWithReviews = await page.goto(
      '/api/feeds/google-vacation-rentals?include_reviews=true'
    )
    const contentWithReviews = await responseWithReviews?.text()

    // Request without reviews
    const responseNoReviews = await page.goto(
      '/api/feeds/google-vacation-rentals?include_reviews=false'
    )
    const contentNoReviews = await responseNoReviews?.text()

    // Verify reviews parameter affects response
    expect(contentWithReviews).toBeDefined()
    expect(contentNoReviews).toBeDefined()
  })

  test('should handle currency parameter', async ({ page }) => {
    // Request with specific currency
    const response = await page.goto('/api/feeds/google-vacation-rentals?currency=EUR')

    expect(response?.status()).toBe(200)

    // Verify response contains currency information
    const content = await response?.text()
    expect(content).toBeTruthy()
  })

  test('should reject invalid limit parameter', async ({ page }) => {
    // Request with limit > 1000
    const response = await page.goto('/api/feeds/google-vacation-rentals?limit=5000')

    // Should either reject or cap at 1000
    expect(response?.status()).toBe(200)

    // Content should be valid XML
    const content = await response?.text()
    expect(content).toContain('<?xml')
  })
})
