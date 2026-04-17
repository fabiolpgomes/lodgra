/**
 * Cache de perfil de utilizador — Upstash Redis (TTL 60s).
 *
 * Elimina o segundo round trip à DB em cada API call:
 *   requireRole() → auth.getUser() + user_profiles.select()
 *                              ↑ este select é cacheado aqui
 *
 * Comportamento por ambiente:
 *   UPSTASH_REDIS_REST_URL configurada → cache distribuído via Redis
 *   Sem env vars → skip cache, sempre consulta a DB (dev local / CI)
 *
 * Fail-open: erro no Redis → retorna null → requireRole() cai para DB.
 */

import { Redis } from '@upstash/redis'

export interface CachedProfile {
  role: string
  access_all_properties: boolean
  organization_id: string | null
  guest_type?: string | null
}

const PREFIX = '@lodgra/profile:'
const TTL_SECONDS = 60

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

export async function getCachedProfile(userId: string): Promise<CachedProfile | null> {
  const redis = getRedis()
  if (!redis) return null

  try {
    const data = await redis.get<CachedProfile>(`${PREFIX}${userId}`)
    return data ?? null
  } catch {
    return null
  }
}

export async function setCachedProfile(userId: string, profile: CachedProfile): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    await redis.set(`${PREFIX}${userId}`, profile, { ex: TTL_SECONDS })
  } catch {
    // Fail-open: falha silenciosa, a DB é a fonte de verdade
  }
}

export async function invalidateCachedProfile(userId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    await redis.del(`${PREFIX}${userId}`)
  } catch {
    // Fail-open
  }
}
