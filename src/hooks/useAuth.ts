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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const { data: profileRow } = await supabase
            .from('user_profiles')
            .select('full_name, role, avatar_url, access_all_properties, organization_id')
            .eq('id', user.id)
            .maybeSingle()

          if (profileRow) {
            setProfile({
              id: user.id,
              email: user.email ?? '',
              full_name: profileRow.full_name,
              role: profileRow.role as UserRole,
              avatar_url: profileRow.avatar_url,
              access_all_properties: profileRow.access_all_properties,
              organization_id: profileRow.organization_id ?? null,
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
    try {
      const supabase = createClient()
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          loadUser()
        } else {
          setUser(null)
          setProfile(null)
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    } catch (error) {
      console.error('Error setting up auth listener:', error)
      return () => {}
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

    // Gestor sénior pode excluir dados operacionais; gestão de usuários é exclusiva do Admin
    delete: () => hasFullOperationalAccess(profile),
    manageUsers: () => profile?.role === 'admin',
  }

  return { can, role: profile?.role || 'viewer', profile }
}
