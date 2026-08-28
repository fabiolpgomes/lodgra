'use client'

import { useEffect, useState } from 'react'
import { type User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { hasFullOperationalAccess } from '@/lib/auth/permissions'

export type UserRole = 'admin' | 'gestor' | 'viewer'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  access_all_properties: boolean
  organization_id?: string | null
  phone_number?: string | null
  accepts_whatsapp?: boolean
}

interface AuthSnapshot {
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

const defaultSnapshot: AuthSnapshot = {
  user: null,
  profile: null,
  loading: false,
}

let snapshot: AuthSnapshot = defaultSnapshot
let hydrated = false
let loadPromise: Promise<void> | null = null
const subscribers = new Set<() => void>()

function emit() {
  for (const subscriber of subscribers) {
    subscriber()
  }
}

function setSnapshot(next: AuthSnapshot) {
  snapshot = next
  emit()
}

async function hydrateAuthState(force = false) {
  if (loadPromise && !force) return loadPromise
  if (hydrated && !force) return Promise.resolve()

  loadPromise = (async () => {
    setSnapshot({ ...snapshot, loading: true })

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setSnapshot({ user: null, profile: null, loading: false })
        hydrated = true
        return
      }

      const { data: profileRow } = await supabase
        .from('user_profiles')
        .select('full_name, role, avatar_url, access_all_properties, organization_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profileRow) {
        const effectiveRole = profileRow.access_all_properties ? 'admin' : (profileRow.role as UserProfile['role'])
        setSnapshot({
          user,
          profile: {
            id: user.id,
            email: user.email ?? '',
            full_name: profileRow.full_name,
            role: effectiveRole,
            avatar_url: profileRow.avatar_url,
            access_all_properties: profileRow.access_all_properties,
            organization_id: profileRow.organization_id ?? null,
          },
          loading: false,
        })
      } else {
        setSnapshot({ user, profile: null, loading: false })
      }

      hydrated = true
    } catch (error) {
      console.error('Error loading user:', error)
      setSnapshot({ user: null, profile: null, loading: false })
      hydrated = true
    } finally {
      loadPromise = null
    }
  })()

  return loadPromise
}

function subscribe(listener: () => void) {
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}

export function useAuth(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  const [state, setState] = useState<AuthSnapshot>(snapshot)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let active = true
    const sync = () => {
      if (active) setState(snapshot)
    }

    const unsubscribe = subscribe(sync)
    void hydrateAuthState().then(sync)

    try {
      const supabase = createClient()
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          hydrated = false
          void hydrateAuthState(true)
        } else {
          hydrated = true
          setSnapshot(defaultSnapshot)
        }
      })

      return () => {
        active = false
        unsubscribe()
        subscription.unsubscribe()
      }
    } catch (error) {
      console.error('Error setting up auth listener:', error)
      return () => {
        active = false
        unsubscribe()
      }
    }
  }, [enabled])

  if (!enabled) {
    return defaultSnapshot
  }

  return state
}

export function usePermissions() {
  const { profile } = useAuth()

  const can = {
    // Viewer: apenas visualizar
    view: () => true,

    // Manager e Admin: criar e editar
    create: () => profile?.role === 'admin' || profile?.role === 'gestor',
    edit: () => profile?.role === 'admin' || profile?.role === 'gestor',

    // Gestor sénior pode excluir dados operacionais; gestão de usuários é exclusiva do Admin
    delete: () => hasFullOperationalAccess(profile),
    manageUsers: () => profile?.role === 'admin',
  }

  return { can, role: profile?.role || 'viewer', profile }
}
