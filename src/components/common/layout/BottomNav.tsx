'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
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
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/lib/i18n/routing'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/common/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'

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
  const router = useRouter()
  const pathname = usePathname()
  const { profile } = useAuth()
  const locale = useLocale()
  const isAdmin = profile?.role === 'admin'
  const isGestor = profile?.role === 'gestor'
  const [moreOpen, setMoreOpen] = useState(false)

  async function handleLogout() {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Sessão terminada!')
      setMoreOpen(false)
      router.push(`${locale ? `/${locale}` : ''}/login`)
      router.refresh()
    } catch {
      toast.error('Erro ao terminar sessão')
    }
  }

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
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-lodgra-blue/10 pb-safe">
        <div className="flex items-stretch">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[64px] transition-all ${
                  active ? 'text-lodgra-accent' : 'text-lodgra-blue/60 hover:bg-lodgra-accent/10'
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
              isMoreActive ? 'text-lodgra-accent' : 'text-lodgra-blue/60 hover:bg-lodgra-accent/10'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[1px] leading-none font-[family-name:var(--font-hanken-grotesk)]">Mais</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-none pb-safe border-t border-lodgra-blue/10">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-left text-[14px] font-black text-lodgra-blue uppercase tracking-[2px] font-[family-name:var(--font-hanken-grotesk)]">MENU GLOBAL</SheetTitle>
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
                        ? 'border-lodgra-accent text-lodgra-accent bg-transparent'
                        : 'border-lodgra-blue/10 text-lodgra-blue hover:bg-lodgra-accent/10'
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
              <p className="text-[10px] font-black text-lodgra-blue/30 uppercase tracking-[2px] mb-3 px-1 font-[family-name:var(--font-hanken-grotesk)]">Configuração</p>
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
                          ? 'border-lodgra-accent text-lodgra-accent bg-transparent'
                          : 'border-lodgra-blue/10 text-lodgra-blue hover:bg-lodgra-accent/10'
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
                        ? 'border-lodgra-accent text-lodgra-accent bg-transparent'
                        : 'border-lodgra-blue/10 text-lodgra-blue hover:bg-lodgra-accent/10'
                    }`}
                  >
                    <UserCog className="h-5 w-5 shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-[1px] font-[family-name:var(--font-hanken-grotesk)]">Utilizadores</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Logout */}
            <div className="pt-4 border-t border-lodgra-blue/10">
              <Button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 h-12 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-black uppercase tracking-[1px] text-[11px] font-[family-name:var(--font-hanken-grotesk)]"
                variant="ghost"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
