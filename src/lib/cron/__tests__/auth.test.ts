import { createTestRequest } from '@/__tests__/utils/test-request'
import { isAuthorizedCronRequest } from '@/lib/cron/auth'

describe('isAuthorizedCronRequest', () => {
  const secret = 'cron-secret'

  it('accepts the exact Bearer credential', () => {
    const request = createTestRequest('http://localhost/api/cron/test', {
      headers: { authorization: `Bearer ${secret}` },
    })

    expect(isAuthorizedCronRequest(request, secret)).toBe(true)
  })

  it.each([
    ['missing header', undefined],
    ['wrong secret', 'Bearer wrong'],
    ['wrong scheme', secret],
  ])('rejects %s', (_label, authorization) => {
    const request = createTestRequest('http://localhost/api/cron/test', {
      headers: authorization ? { authorization } : undefined,
    })

    expect(isAuthorizedCronRequest(request, secret)).toBe(false)
  })

  it('fails closed when CRON_SECRET is empty', () => {
    const request = createTestRequest('http://localhost/api/cron/test', {
      headers: { authorization: 'Bearer undefined' },
    })

    expect(isAuthorizedCronRequest(request, '')).toBe(false)
  })
})
