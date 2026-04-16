/**
 * Cache de status de subscrição — Upstash Redis (TTL 5 min).
 *
 * Elimina as 2 queries à DB no middleware em cada page load:
 *   1. user_profiles.select('organization_id')
 *   2. organizations.select('subscription_status')
 *
 * Invalidado pelo webhook Stripe imediatamente após cada evento
 * de subscrição (cancelled, past_due, updated).
 * TTL de 5 min é o fallback caso o webhook não invalide.
 */

import { Redis } from '@upstash/redis'

const PREFIX = '@homestay/subscription:'
const TTL_SECONDS = 5 * 60

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

export async function getCachedSubscriptionStatus(orgId: string): Promise<string | null> {
  const redis = getRedis()
  if (!redis) return null

  try {
    return await redis.get<string>(`${PREFIX}${orgId}`)
  } catch {
    return null
  }
}

export async function setCachedSubscriptionStatus(orgId: string, status: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    await redis.set(`${PREFIX}${orgId}`, status, { ex: TTL_SECONDS })
  } catch {
    // Fail-open
  }
}

export async function invalidateCachedSubscriptionStatus(orgId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    await redis.del(`${PREFIX}${orgId}`)
  } catch {
    // Fail-open
  }
}
