/**
 * Test utilities for creating NextRequest with proper Headers initialization
 */

import { NextRequest } from 'next/server'

export function createTestRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: string | BodyInit
  } = {}
): NextRequest {
  const headers = new Headers()

  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headers.set(key, value)
    }
  }

  return new NextRequest(url, {
    method: options.method || 'GET',
    headers,
    body: options.body,
  })
}
