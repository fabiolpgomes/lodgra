import { test, expect } from '@playwright/test'
import { parseStringPromise } from 'xml2js'

const feedPath = '/api/feeds/google-vacation-rentals?currency=EUR'

test.describe('Google Vacation Rentals Feed Validation', () => {
  test('should load property page with Schema.org markup', async ({ page, request }) => {
    let slug = process.env.TEST_PROPERTY_SLUG
    if (!slug) {
      const response = await request.get(feedPath)
      expect(response.status()).toBe(200)
      const xml = await parseStringPromise(await response.text())
      const propertyLink = xml.feed.entry?.flatMap(
        (entry: { link: Array<{ $: { rel: string; href: string } }> }) => entry.link
      ).find((link: { $: { rel: string; href: string } }) =>
        link.$.rel === 'alternate' && !/\/p\/(null|undefined)?$/.test(link.$.href)
      )?.$.href
      expect(propertyLink, 'Configure TEST_PROPERTY_SLUG or publish a property in the test feed').toBeTruthy()
      slug = new URL(propertyLink).pathname.split('/p/')[1]
    }
    expect(slug).toBeTruthy()
    const response = await page.goto(`/p/${slug}`)
    expect(response?.status()).toBe(200)

    // The root layout also emits Organization and WebSite schemas.
    // Playwright's text engine excludes script contents; inspect textContent.
    const schemas = (await page.locator('script[type="application/ld+json"]').allTextContents())
      .map(content => JSON.parse(content))
      .filter(schema => schema['@type'] === 'LodgingBusiness')
    expect(schemas).toHaveLength(1)
    const schema = schemas[0]
    expect(schema['@type']).toBe('LodgingBusiness')
    expect(schema.name).toEqual(expect.any(String))
    expect(schema.name.trim()).not.toBe('')
  })

  test('should return valid Atom XML feed', async ({ request }) => {
    const startTime = Date.now()
    const response = await request.get(feedPath)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/atom+xml')
    expect(Date.now() - startTime).toBeLessThan(5000)
    const xml = await parseStringPromise(await response.text())
    expect(xml.feed.$.xmlns).toBe('http://www.w3.org/2005/Atom')
    expect(xml.feed.id[0]).toBe('urn:lodgra:feed:properties')
  })

  test('should support pagination in feed', async ({ request }) => {
    const response = await request.get(`${feedPath}&limit=10`)
    expect(response.status()).toBe(200)
    const count = response.headers()['x-feed-count']
    expect(count).toMatch(/^\d+$/)
    expect(Number(count)).toBeLessThanOrEqual(10)
    const xml = await parseStringPromise(await response.text())
    expect(xml.feed.entry?.length || 0).toBe(Number(count))
  })

  test('should return ETag header for caching', async ({ request }) => {
    const response = await request.get(feedPath)
    expect(response.status()).toBe(200)
    expect(response.headers()['etag']).toMatch(/^W\/".+"$/)
    expect(response.headers()['cache-control']).toContain('public')
    expect(response.headers()['cache-control']).toContain('max-age')
  })

  test('should handle 304 Not Modified with If-None-Match', async ({ request }) => {
    const firstResponse = await request.get(feedPath)
    expect(firstResponse.status()).toBe(200)
    const etag = firstResponse.headers()['etag']
    expect(etag).toBeTruthy()
    const cachedResponse = await request.get(feedPath, { headers: { 'If-None-Match': etag } })
    expect(cachedResponse.status()).toBe(304)
    expect(await cachedResponse.body()).toHaveLength(0)
  })

  test('should support include_reviews parameter', async ({ request }) => {
    for (const includeReviews of ['true', 'false']) {
      const response = await request.get(`${feedPath}&include_reviews=${includeReviews}`)
      expect(response.status()).toBe(200)
      const xml = await parseStringPromise(await response.text())
      expect(xml.feed).toBeDefined()
    }
  })

  test('should require a valid currency parameter', async ({ request }) => {
    const response = await request.get('/api/feeds/google-vacation-rentals')
    expect(response.status()).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid currency' })
  })

  test('should cap oversized limit parameter at 1000', async ({ request }) => {
    const response = await request.get(`${feedPath}&limit=5000`)
    expect(response.status()).toBe(200)
    expect(Number(response.headers()['x-feed-count'])).toBeLessThanOrEqual(1000)
    expect((await parseStringPromise(await response.text())).feed).toBeDefined()
  })
})
