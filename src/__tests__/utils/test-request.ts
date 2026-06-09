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
  const req = new Request(url, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body,
  }) as any

  return req
}
