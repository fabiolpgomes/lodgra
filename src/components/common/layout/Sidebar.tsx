'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Calendar,
  Building2,
  CalendarDays,
  Receipt,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Users,
  Settings,
  UserCog,
  LogOut,
} from 'lucide-react'
import { Logo } from '@/components/common/ui/Logo'
import { LocaleSelector } from '@/components/common/header/LocaleSelector'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/lib/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserProfile } from '@/lib/auth/getUserAccess'

const PRIMARY_PATHS = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/properties', label: 'Propriedades', icon: Building2 },
  { path: '/reservations', label: 'Reservas', icon: Calendar },
  { path: '/expenses', label: 'Despesas', icon: Receipt },
  { path: '/financial', label: 'Financeiro', icon: TrendingUp },
  { path: '/calendar', label: 'Calendário', icon: CalendarDays },
  { path: '/reports', label: 'Relatórios', icon: BarChart3 },
]

const CONFIG_PATHS = [
  { path: '/owners', label: 'Proprietários', icon: Users },
  { path: '/sync', label: 'Sincronização', icon: RefreshCw },
  { path: '/settings', label: 'Definições', icon: Settings },
]

interface SidebarProps {
  serverProfile?: UserProfile
}

export function Sidebar({ serverProfile }: SidebarProps) {
  const { profile: clientProfile } = useAuth()
  const profile = serverProfile || clientProfile
  const pathname = usePathname()
  const locale = useLocale()
  const router = useRouter()

  const isAdmin = profile?.role === 'admin'
  const isGestor = profile?.role === 'gestor'
  const prefix = locale ? `/${locale}` : ''

  const primaryLinks = PRIMARY_PATHS
    .filter(({ path }) => {
      if (isGestor && (path === '/' || path === '/financial' || path === '/reports')) return false
      return true
    })
    .map(({ path, label, icon }) => ({
      href: path === '/' ? (prefix || '/') : `${prefix}${path}`,
      label,
      icon,
    }))

  const configLinks = [
    ...CONFIG_PATHS.map(({ path, label, icon }) => ({ href: `${prefix}${path}`, label, icon })),
    ...(isAdmin ? [{ href: `${prefix}/admin/users`, label: 'Utilizadores', icon: UserCog }] : []),
  ]

  function isActive(href: string) {
    if (href === (prefix || '/')) return pathname === href
    return pathname.startsWith(href)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : profile?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <aside
      className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 bg-[#1E3A8A] border-r border-[#ffffff]/10"
      style={{ width: '260px' }}
    >
      <div className="px-6 py-10 bg-white border-b border-lodgra-blue/10 flex items-center justify-center">
        <Link href={prefix || '/'} className="flex items-center">
          <Logo size="lg" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-8 space-y-2">
        {/* Primary group */}
        {primaryLinks.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-none text-[13px] font-black uppercase tracking-[1px] transition-all font-[family-name:var(--font-hanken-grotesk)] ${
                active
                  ? 'bg-[#ffc000] text-[#1E3A8A]'
                  : 'text-[#ffffff]/70 hover:text-[#ffc000] hover:bg-[#ffffff]/5'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Config group */}
        <div className="pt-8">
          <p className="px-4 mb-4 text-[10px] font-black uppercase tracking-[2px] text-[#ffffff]/30 font-[family-name:var(--font-hanken-grotesk)]">
            Configuração
          </p>
          {configLinks.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-none text-[13px] font-black uppercase tracking-[1px] transition-all font-[family-name:var(--font-hanken-grotesk)] ${
                  active
                    ? 'bg-[#ffc000] text-[#1E3A8A]'
                    : 'text-[#ffffff]/70 hover:text-[#ffc000] hover:bg-[#ffffff]/5'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom: profile + locale + signout */}
      <div className="px-4 py-6 border-t border-[#ffffff]/10 space-y-4 bg-[#030447]/30">
        <div className="flex items-center justify-between px-2">
          <LocaleSelector />
        </div>

        <div className="flex items-center gap-3 px-2 py-3 bg-[#ffffff]/5 border border-[#ffffff]/10">
          <div
            className="w-9 h-9 rounded-none flex items-center justify-center text-[14px] font-black text-[#1E3A8A] shrink-0 font-[family-name:var(--font-hanken-grotesk)]"
            style={{ background: '#ffc000' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-black text-[#ffffff] truncate uppercase tracking-[0.5px] font-[family-name:var(--font-hanken-grotesk)]">
              {profile?.full_name || profile?.email || 'Utilizador'}
            </p>
            <p className="text-[10px] text-[#ffffff]/40 uppercase font-bold tracking-[1px] font-[family-name:var(--font-hanken-grotesk)]">{profile?.role || 'admin'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-[#ffffff]/40 hover:text-[#ffc000] hover:bg-[#ffffff]/10 transition-all"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
