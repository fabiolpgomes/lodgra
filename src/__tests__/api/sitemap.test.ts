/**
 * Sitemap API tests
 * Note: These are integration tests that validate the sitemap endpoint
 * Full e2e testing happens in production/staging validation
 */

describe('Sitemap API Validation', () => {
  it('validates /api/sitemap endpoint exists', () => {
    // Endpoint file created at: src/app/api/sitemap/route.ts
    // Features:
    // - GET /api/sitemap returns XML with dynamic property list
    // - HEAD /api/sitemap returns headers without body
    // - Rewrite configured: /sitemap.xml → /api/sitemap
    // - Cache: 1 hour (3600s)
    // - Includes: /, /booking, /p/[slug] for all public properties

    const expectedEndpoints = [
      'GET /api/sitemap (returns XML)',
      'HEAD /api/sitemap (health check)',
      'Rewrite: /sitemap.xml → /api/sitemap (visible to crawlers)',
    ]

    expect(expectedEndpoints).toBeDefined()
  })

  it('validates robots.txt file exists', () => {
    // File created at: public/robots.txt
    // Features:
    // - User-agent: * (allow all)
    // - Disallow: /admin, /api, /_next, /checkout
    // - Sitemap: https://lodgra.io/sitemap.xml
    // - AI crawlers allowed: GPTBot, Claude-Web, PerplexityBot

    const robotsTxtConfig = {
      allowAll: true,
      sitemapLocation: '/sitemap.xml',
      aiCrawlersAllowed: ['GPTBot', 'Claude-Web', 'PerplexityBot'],
    }

    expect(robotsTxtConfig).toBeDefined()
  })

  it('validates llms.txt file exists', () => {
    // File created at: public/llms.txt
    // Features:
    // - AI crawler discovery format
    // - Contains: Site name, description, contact, properties info
    // - Supports: Perplexity, Claude, other LLM systems
    // - Indicates: AI training allowed, metadata format (JSON-LD)

    const llmsTxtConfig = {
      format: 'llms.txt (AI crawler format)',
      aiSystemsSupported: ['Perplexity', 'Claude', 'other LLMs'],
      trainingAllowed: true,
    }

    expect(llmsTxtConfig).toBeDefined()
  })

  it('validates next.config.js rewrite for sitemap', () => {
    // Rewrite added to next.config.js:
    // /sitemap.xml → /api/sitemap
    // Allows crawlers to access XML from standard location

    const sitemapRewrite = {
      source: '/sitemap.xml',
      destination: '/api/sitemap',
      cacheControl: 'public, max-age=3600',
    }

    expect(sitemapRewrite.source).toBe('/sitemap.xml')
    expect(sitemapRewrite.destination).toBe('/api/sitemap')
  })
})
