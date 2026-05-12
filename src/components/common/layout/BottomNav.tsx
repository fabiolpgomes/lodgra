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
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-[#1E3A8A]/10 pb-safe">
        <div className="flex items-stretch">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[64px] transition-all ${
                  active ? 'text-[#ffc000] bg-[#1E3A8A]' : 'text-[#1E3A8A]/60 hover:bg-[#1E3A8A]/5'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-[1px] leading-none font-[family-name:var(--font-hanken-grotesk)]">{label}</span>
              </Link>
            )
          })}

          {/* Mais */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[64px] transition-all ${
              isMoreActive ? 'text-[#ffc000] bg-[#1E3A8A]' : 'text-[#1E3A8A]/60 hover:bg-[#1E3A8A]/5'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[1px] leading-none font-[family-name:var(--font-hanken-grotesk)]">Mais</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-none pb-safe border-t border-[#1E3A8A]/10">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-left text-[14px] font-black text-[#1E3A8A] uppercase tracking-[2px] font-[family-name:var(--font-hanken-grotesk)]">MENU GLOBAL</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 pb-8">
            {/* Geral */}
            <div className="grid grid-cols-2 gap-2">
              {visibleMoreNav.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 p-4 rounded-none border transition-all ${
                      active
                        ? 'bg-[#ffc000] border-[#ffc000] text-[#1E3A8A]'
                        : 'bg-[#f8f8f8] border-[#1E3A8A]/5 text-[#1E3A8A]/70 hover:border-[#ffc000]/30'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-[1px] font-[family-name:var(--font-hanken-grotesk)]">{label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Configuração */}
            <div>
              <p className="text-[10px] font-black text-[#1E3A8A]/30 uppercase tracking-[2px] mb-3 px-1 font-[family-name:var(--font-hanken-grotesk)]">Configuração</p>
              <div className="grid grid-cols-2 gap-2">
                {CONFIG_NAV.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 p-4 rounded-none border transition-all ${
                        active
                          ? 'bg-[#ffc000] border-[#ffc000] text-[#1E3A8A]'
                          : 'bg-[#f8f8f8] border-[#1E3A8A]/5 text-[#1E3A8A]/70 hover:border-[#ffc000]/30'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="text-[11px] font-black uppercase tracking-[1px] font-[family-name:var(--font-hanken-grotesk)]">{label}</span>
                    </Link>
                  )
                })}
                {isAdmin && (
                  <Link
                    href={`${prefix}/admin/users`}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 p-4 rounded-none border transition-all ${
                      pathname === `${prefix}/admin/users`
                        ? 'bg-[#ffc000] border-[#ffc000] text-[#1E3A8A]'
                        : 'bg-[#f8f8f8] border-[#1E3A8A]/5 text-[#1E3A8A]/70 hover:border-[#ffc000]/30'
                    }`}
                  >
                    <UserCog className="h-5 w-5 shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-[1px] font-[family-name:var(--font-hanken-grotesk)]">Utilizadores</span>
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
