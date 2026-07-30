/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test utilities for creating NextRequest with proper Headers initialization
 */

export function createTestRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: string | BodyInit
  } = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const bodyStr = typeof options.body === 'string' ? options.body : String(options.body || '')

  const req = new Request(url, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body,
  }) as any

  // Add nextUrl property for Next.js 15 route handlers
  const urlObj = new URL(url)
  req.nextUrl = {
    clone: () => new URL(url),
    searchParams: urlObj.searchParams,
    pathname: urlObj.pathname,
    href: url,
    protocol: urlObj.protocol,
    host: urlObj.host,
    hostname: urlObj.hostname,
    port: urlObj.port,
    origin: urlObj.origin,
  } as any

  // Mock text() method for webhook tests
  req.text = jest.fn(async () => bodyStr)
  req.json = jest.fn(async () => JSON.parse(bodyStr))

  return req
}
