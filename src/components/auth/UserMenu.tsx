'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from '@/lib/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { LogOut, User, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { type User as SupabaseUser } from '@supabase/supabase-js'
import { Button } from '@/components/common/ui/button'

interface UserProfile {
  full_name: string | null
  role: 'admin' | 'gestor' | 'viewer'
}

export function UserMenu() {
  const router = useRouter()
  const locale = useLocale()
  const prefix = locale ? `/${locale}` : ''
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase.rpc('get_my_profile')
        if (data && data.length > 0) {
          setProfile({ full_name: null, role: data[0].role })
        }
      }

      setLoading(false)
    }

    loadUser()
  }, [])

  async function handleLogout() {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Sessão terminada!')
      router.push(`${prefix}/login`)
      router.refresh()
    } catch {
      toast.error('Erro ao terminar sessão')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
      </div>
    )
  }

  if (!user) return null

  const roleLabel = {
    admin: 'Admin',
    gestor: 'Gestor',
    viewer: 'Visualizador',
    guest: 'Convidado'
  }[(profile?.role as 'admin' | 'gestor' | 'viewer' | 'guest') || 'viewer']

  return (
    <div className="flex items-center gap-2">
      {/* User Info + Account Link */}
      <Link href={`${prefix}/account`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="h-5 w-5 text-blue-600" />
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-medium text-gray-900">
            {profile?.full_name || user.email?.split('@')[0]}
          </p>
          <p className="text-xs text-gray-500">{roleLabel}</p>
        </div>
      </Link>

      {/* Account Button (mobile) */}
      <Link
        href={`${prefix}/account`}
        className="md:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
        title="Minha Conta"
      >
        <KeyRound className="h-4 w-4" />
      </Link>

      {/* Logout Button */}
      <Button
        variant="ghost"
        onClick={handleLogout}
        className="flex items-center gap-2"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sair</span>
      </Button>
    </div>
  )
}
