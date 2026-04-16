/**
 * Forex Rates Manager
 * Handles caching, fallback rates, and rate updates
 * Uses Redis for distributed caching (with in-memory fallback)
 */

import { Redis } from '@upstash/redis'
import { fetchForexRates, ForexRates } from './client'

const CACHE_KEY = 'forex:rates'
const CACHE_TTL = 60 * 60 // 1 hour in seconds

// Fallback rates if API unavailable (last known safe rates)
// These are approximate typical rates - will be updated when API comes back online
const FALLBACK_RATES: ForexRates = {
  EUR: 1,
  BRL: 5.5, // 1 EUR ≈ 5.5 BRL
  USD: 1.1, // 1 EUR ≈ 1.1 USD
}

// In-memory cache fallback (if Redis not available)
let memoryCache: { rates: ForexRates; timestamp: number } | null = null

/**
 * Get Redis client (with fallback if not configured)
 */
function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  try {
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  } catch {
    return null
  }
}

/**
 * Get cached rates from Redis or memory
 */
async function getCachedRates(): Promise<ForexRates | null> {
  const redis = getRedisClient()

  if (redis) {
    try {
      const cached = await redis.get<ForexRates>(CACHE_KEY)
      if (cached) {
        console.log('[forex] Retrieved rates from Redis cache')
        return cached
      }
    } catch (error) {
      console.warn('[forex] Redis cache miss:', error)
    }
  }

  // Fallback to in-memory cache (1 hour TTL)
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL * 1000) {
    console.log('[forex] Retrieved rates from memory cache')
    return memoryCache.rates
  }

  return null
}

/**
 * Store rates in cache (Redis + memory)
 */
async function setCachedRates(rates: ForexRates): Promise<void> {
  const redis = getRedisClient()

  if (redis) {
    try {
      await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(rates))
      console.log('[forex] Stored rates in Redis cache')
    } catch (error) {
      console.warn('[forex] Failed to cache in Redis:', error)
    }
  }

  // Always update memory cache as fallback
  memoryCache = {
    rates,
    timestamp: Date.now(),
  }
}

/**
 * Get current forex rates (from cache or API)
 * Returns cached rates if available, falls back to API, then fallback rates
 */
export async function getRates(): Promise<ForexRates> {
  // 1. Try cache
  const cached = await getCachedRates()
  if (cached) {
    return cached
  }

  // 2. Try to fetch from API
  try {
    const fresh = await fetchForexRates()
    await setCachedRates(fresh)
    console.log('[forex] Fetched fresh rates from API:', fresh)
    return fresh
  } catch (error) {
    console.error('[forex] Failed to fetch rates, using fallback:', error)
    // 3. Use hardcoded fallback rates
    return FALLBACK_RATES
  }
}

/**
 * Force update rates from API (called by cron job)
 */
export async function updateRates(): Promise<ForexRates> {
  try {
    const fresh = await fetchForexRates()
    await setCachedRates(fresh)
    console.log('[forex] Updated rates from API:', fresh)
    return fresh
  } catch (error) {
    console.error('[forex] Failed to update rates:', error)
    // Return cached or fallback
    const cached = await getCachedRates()
    return cached || FALLBACK_RATES
  }
}

/**
 * Clear cache (useful for testing)
 */
export async function clearCache(): Promise<void> {
  const redis = getRedisClient()

  if (redis) {
    try {
      await redis.del(CACHE_KEY)
      console.log('[forex] Cleared Redis cache')
    } catch (error) {
      console.warn('[forex] Failed to clear Redis cache:', error)
    }
  }

  memoryCache = null
}
