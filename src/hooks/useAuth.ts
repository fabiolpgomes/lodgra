'use client'

import { useEffect, useState } from 'react'
import { type User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export type UserRole = 'admin' | 'gestor' | 'viewer'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  access_all_properties: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const { data: rpcData } = await supabase.rpc('get_my_profile')
          if (rpcData && rpcData.length > 0) {
            const row = rpcData[0]
            setProfile({
              id: user.id,
              email: user.email ?? '',
              full_name: null,
              role: row.role as UserRole,
              avatar_url: null,
              access_all_properties: row.access_all_properties,
            })
          }
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUser()
      } else {
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, profile, loading }
}

export function usePermissions() {
  const { profile } = useAuth()

  const can = {
    // Viewer: apenas visualizar
    view: () => true,

    // Manager e Admin: criar e editar
    create: () => profile?.role === 'admin' || profile?.role === 'gestor',
    edit: () => profile?.role === 'admin' || profile?.role === 'gestor',

    // Apenas Admin: deletar e gerenciar usuários
    delete: () => profile?.role === 'admin',
    manageUsers: () => profile?.role === 'admin',
  }

  return { can, role: profile?.role || 'viewer', profile }
}
