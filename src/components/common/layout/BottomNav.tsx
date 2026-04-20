'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Home,
  Calendar,
  Building2,
  CalendarDays,
  MoreHorizontal,
  Receipt,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Users,
  UserCog,
  Settings,
  CheckSquare,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/lib/i18n/routing'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/common/ui/sheet'

const PRIMARY_PATHS = [
  { path: '/', label: 'Início', icon: Home },
  { path: '/reservations', label: 'Reservas', icon: Calendar },
  { path: '/properties', label: 'Imóveis', icon: Building2 },
  { path: '/calendar', label: 'Calendário', icon: CalendarDays },
]

const MORE_PATHS = [
  { path: '/expenses', label: 'Despesas', icon: Receipt },
  { path: '/financial', label: 'Financeiro', icon: TrendingUp },
  { path: '/reports', label: 'Relatórios', icon: BarChart3 },
  { path: '/cleaning', label: 'Limpezas', icon: CheckSquare },
]

const CONFIG_PATHS = [
  { path: '/owners', label: 'Proprietários', icon: Users },
  { path: '/sync', label: 'Sincronização', icon: RefreshCw },
  { path: '/settings', label: 'Definições', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  const { profile } = useAuth()
  const locale = useLocale()
  const isAdmin = profile?.role === 'admin'
  const isGestor = profile?.role === 'gestor'
  const [moreOpen, setMoreOpen] = useState(false)

  const prefix = locale ? `/${locale}` : ''

  // Filter primary nav: gestor cannot see Dashboard (Início)
  const visiblePrimaryPaths = isGestor
    ? PRIMARY_PATHS.filter(p => p.path !== '/')
    : PRIMARY_PATHS

  const PRIMARY_NAV = visiblePrimaryPaths.map(({ path, label, icon }) => ({
    href: path === '/' ? (prefix || '/') : `${prefix}${path}`,
    label,
    icon,
  }))
  const MORE_NAV = MORE_PATHS.map(({ path, label, icon }) => ({
    href: `${prefix}${path}`,
    label,
    icon,
  }))
  const CONFIG_NAV = CONFIG_PATHS.map(({ path, label, icon }) => ({
    href: `${prefix}${path}`,
    label,
    icon,
  }))

  // Filter more nav: gestor cannot see financial pages or reports
  const visibleMoreNav = MORE_NAV.filter(link => {
    if (isGestor && (link.href.endsWith('/reports') || link.href.endsWith('/financial'))) {
      return false
    }
    return true
  })

  const isMoreActive = visibleMoreNav.some(l => pathname === l.href) ||
    CONFIG_NAV.some(l => pathname === l.href) ||
    (isAdmin && pathname === `${prefix}/admin/users`)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t border-black/[0.06] safe-area-pb">
        <div className="flex items-stretch">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                  active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </Link>
            )
          })}

          {/* Mais */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
              isMoreActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Mais</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-base font-semibold text-gray-900">Menu</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-6">
            {/* Geral */}
            <div className="grid grid-cols-3 gap-3">
              {visibleMoreNav.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs font-medium text-center leading-tight">{label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Configuração */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">Configuração</p>
              <div className="grid grid-cols-3 gap-3">
                {CONFIG_NAV.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${
                        active
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-xs font-medium text-center leading-tight">{label}</span>
                    </Link>
                  )
                })}
                {isAdmin && (
                  <Link
                    href={`${prefix}/admin/users`}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${
                      pathname === `${prefix}/admin/users`
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <UserCog className="h-6 w-6" />
                    <span className="text-xs font-medium text-center leading-tight">Utilizadores</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
