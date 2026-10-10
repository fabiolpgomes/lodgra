'use client'

import { useEffect, useState } from 'react'

// Uma única consulta por utilizador, partilhada entre Sidebar e BottomNav.
const lookups = new Map<string, Promise<boolean>>()

async function fetchIsPlatformAdmin(): Promise<boolean> {
  try {
    const response = await fetch('/api/platform/me', { cache: 'no-store' })
    if (!response?.ok) return false
    const body = (await response.json()) as { isPlatformAdmin?: boolean }
    return body.isPlatformAdmin === true
  } catch {
    return false
  }
}

function lookup(userId: string): Promise<boolean> {
  let pending = lookups.get(userId)
  if (!pending) {
    pending = fetchIsPlatformAdmin()
    lookups.set(userId, pending)
  }
  return pending
}

/**
 * Só decide se o menu mostra o item "Plataforma". Falhar = esconder.
 * A segurança real está no servidor (requirePlatformAdmin / resolvePlatformAdmin).
 */
export function usePlatformAdmin(userId: string | undefined): boolean {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setIsPlatformAdmin(false)
      return
    }
    lookup(userId).then(result => {
      if (!cancelled) setIsPlatformAdmin(result)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  return isPlatformAdmin
}
