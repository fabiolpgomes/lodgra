'use client'

import { useEffect, useState } from 'react'
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
  CheckSquare,
  RefreshCw,
  Users,
  Settings,
  UserCog,
  LogOut,
  Globe,
  ChevronDown,
} from 'lucide-react'
import { Logo } from '@/components/common/ui/Logo'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/lib/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserProfile } from '@/lib/auth/getUserAccess'

const PRIMARY_PATHS = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/properties', label: 'Propriedades', icon: Building2 },
  { path: '/reservations', label: 'Reservas', icon: Calendar },
  { path: '/expenses', label: 'Despesas', icon: Receipt },
  { path: '/financial', label: 'Financeiro', icon: TrendingUp },
  { path: '/calendar', label: 'Calendário', icon: CalendarDays },
]

const CLEANING_SUBMENU = [
  { path: '/cleaning', label: 'Próximas Limpezas' },
  { path: '/cleaning/manage', label: 'Gerenciar Tarefas' },
  { path: '/cleaning/templates', label: 'Modelos de Checklist' },
]

const REPORTS_MODULES = [
  { id: 'financeiro', label: 'Financeiro', icon: TrendingUp },
  { id: 'reservas', label: 'Reservas', icon: Calendar },
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
  const [hasPremium, setHasPremium] = useState(false)
  const [reportsExpanded, setReportsExpanded] = useState(pathname.includes('/reports'))
  const [cleaningExpanded, setCleaningExpanded] = useState(pathname.includes('/cleaning'))

  const isAdmin = profile?.role === 'admin'
  const isGestor = profile?.role === 'gestor'
  const prefix = locale ? `/${locale}` : ''

  useEffect(() => {
    const checkPremiumTier = async () => {
      if (!profile?.id) return

      try {
        const supabase = createClient()

        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', profile.id)
          .single()

        if (!userProfile?.organization_id) return

        const { data: organization } = await supabase
          .from('organizations')
          .select('plan, subscription_plan')
          .eq('id', userProfile.organization_id)
          .single()

        const plan = organization?.subscription_plan || organization?.plan
        setHasPremium(plan === 'premium')
      } catch (error) {
        console.error('Error checking premium tier:', error)
        setHasPremium(false)
      }
    }

    checkPremiumTier()
  }, [profile?.id])

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

  const adminLinks = [
    ...(isAdmin ? [{ href: `${prefix}/admin/users`, label: 'Usuários', icon: UserCog }] : []),
    ...(hasPremium ? [{ href: `${prefix}/admin/google-distribution`, label: 'Google Distribution', icon: Globe }] : []),
  ]

  const configLinks = [
    ...CONFIG_PATHS.map(({ path, label, icon }) => ({ href: `${prefix}${path}`, label, icon })),
    ...adminLinks,
  ]

  function isActive(href: string) {
    return pathname === href || (href !== '/' && pathname.startsWith(href))
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
      className="flex flex-col fixed top-0 left-0 h-screen z-40 bg-white border-r border-lodgra-blue/10"
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
                  ? 'bg-lodgra-accent text-lodgra-blue'
                  : 'text-lodgra-blue hover:text-lodgra-blue hover:bg-lodgra-accent/10'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Cleaning submenu */}
        <div>
          <button
            onClick={() => setCleaningExpanded(!cleaningExpanded)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-none text-[13px] font-black uppercase tracking-[1px] transition-all font-[family-name:var(--font-hanken-grotesk)] ${
              cleaningExpanded || pathname.includes('/cleaning')
                ? 'bg-lodgra-accent text-lodgra-blue'
                : 'text-lodgra-blue hover:text-lodgra-blue hover:bg-lodgra-accent/10'
            }`}
          >
            <CheckSquare className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Limpeza</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${
                cleaningExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Cleaning submenu items */}
          {cleaningExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {CLEANING_SUBMENU.map(({ path, label: submenuLabel }) => {
                const href = path === '/' ? (prefix || '/') : `${prefix}${path}`
                const active = pathname === href
                return (
                  <Link
                    key={path}
                    href={href}
                    className={`flex items-center gap-3 px-4 py-2 rounded-none text-[12px] font-bold uppercase tracking-[0.5px] transition-all font-[family-name:var(--font-hanken-grotesk)] ${
                      active
                        ? 'bg-lodgra-accent/70 text-lodgra-blue'
                        : 'text-lodgra-blue/70 hover:text-lodgra-blue hover:bg-lodgra-accent/20'
                    }`}
                  >
                    {submenuLabel}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Reports submenu */}
        <div>
          <button
            onClick={() => setReportsExpanded(!reportsExpanded)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-none text-[13px] font-black uppercase tracking-[1px] transition-all font-[family-name:var(--font-hanken-grotesk)] ${
              reportsExpanded || pathname.includes('/reports')
                ? 'bg-lodgra-accent text-lodgra-blue'
                : 'text-lodgra-blue hover:text-lodgra-blue hover:bg-lodgra-accent/10'
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Relatórios</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${
                reportsExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Reports submenu items */}
          {reportsExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {REPORTS_MODULES.map(({ id, label }) => {
                const href = `${prefix}/reports/${id}`
                const active = pathname === href
                return (
                  <Link
                    key={id}
                    href={href}
                    className={`flex items-center gap-3 px-4 py-2 rounded-none text-[12px] font-bold uppercase tracking-[0.5px] transition-all font-[family-name:var(--font-hanken-grotesk)] ${
                      active
                        ? 'bg-lodgra-accent/70 text-lodgra-blue'
                        : 'text-lodgra-blue/70 hover:text-lodgra-blue hover:bg-lodgra-accent/20'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Config group */}
        <div className="pt-8">
          <p className="px-4 mb-4 text-[10px] font-black uppercase tracking-[2px] text-lodgra-blue/40 font-[family-name:var(--font-hanken-grotesk)]">
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
                    ? 'bg-lodgra-accent text-lodgra-blue'
                    : 'text-lodgra-blue hover:text-lodgra-blue hover:bg-lodgra-accent/10'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom: profile + signout */}
      <div className="px-4 py-6 border-t border-lodgra-blue/10 space-y-4 bg-white">
        <div className="flex items-center gap-3 px-2 py-3 bg-white border border-lodgra-blue/10 rounded-lg">
          <div
            className="w-9 h-9 rounded-none flex items-center justify-center text-[14px] font-black text-lodgra-blue shrink-0 font-[family-name:var(--font-hanken-grotesk)] bg-lodgra-accent"
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-black text-lodgra-blue truncate uppercase tracking-[0.5px] font-[family-name:var(--font-hanken-grotesk)]">
              {profile?.full_name || profile?.email || 'Usuário'}
            </p>
            <p className="text-[10px] text-lodgra-blue/60 uppercase font-bold tracking-[1px] font-[family-name:var(--font-hanken-grotesk)]">{profile?.role || 'user'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-lodgra-blue/40 hover:text-lodgra-accent hover:bg-lodgra-accent/10 transition-all rounded"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
