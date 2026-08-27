import { retryWithBackoff } from '@/lib/email/retry'

describe('retryWithBackoff', () => {
  it('retries until the operation succeeds', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined)
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce('ok')

    const result = await retryWithBackoff(operation, {
      attempts: 3,
      delaysMs: [10, 20, 30],
      sleep,
    })

    expect(result).toBe('ok')
    expect(operation).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(10)
  })

  it('throws after the last retry fails', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined)
    const operation = jest.fn().mockRejectedValue(new Error('permanent failure'))

    await expect(
      retryWithBackoff(operation, {
        attempts: 2,
        delaysMs: [10, 20],
        sleep,
      }),
    ).rejects.toThrow('permanent failure')

    expect(operation).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledTimes(1)
  })
})
