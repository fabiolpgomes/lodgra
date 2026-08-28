'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Building2, ChevronDown, CreditCard, MoreHorizontal, LogOut, RefreshCw, Settings, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isRestrictedGestor } from '@/lib/auth/permissions'
import { useLocale } from '@/lib/i18n/routing'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/common/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import type { UserProfile } from '@/lib/auth/getUserAccess'
import {
  getLocalizedHref,
  getModuleForPath,
  getModuleNavLinks,
  MODULE_FEATURE_LINKS,
  type ModuleNavigationEntry,
} from '@/lib/navigation/module-shell'

function renderGridLink(
  href: string,
  label: string,
  icon: ModuleNavigationEntry['icon'],
  active: boolean,
  onClick?: () => void
) {
  const Icon = icon

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 border px-4 py-4 transition-all ${
        active
          ? 'border-be-blue text-be-blue bg-transparent'
          : 'border-be-blue/10 text-lodgra-blue hover:bg-be-blue/10'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="text-[11px] font-black uppercase tracking-[1px] font-[family-name:var(--font-hanken-grotesk)]">
        {label}
      </span>
    </Link>
  )
}

interface BottomNavProps {
  serverProfile?: UserProfile
}

export function BottomNav({ serverProfile }: BottomNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { profile: clientProfile } = useAuth({ enabled: !serverProfile })
  const profile = serverProfile || clientProfile
  const locale = useLocale()
  const isAdmin = profile?.role === 'admin'
  const isLimitedGestor = isRestrictedGestor(profile)
  const [moreOpen, setMoreOpen] = useState(false)
  const [showModuleSwitcher, setShowModuleSwitcher] = useState(false)
  const [showAccountLinks, setShowAccountLinks] = useState(false)

  const prefix = locale ? `/${locale}` : ''
  const currentModule = getModuleForPath(pathname)
  const moduleLinks = getModuleNavLinks(prefix).filter(link => {
    return !isLimitedGestor || (link.id !== 'core' && link.id !== 'empresa')
  })
  const currentModuleFeatures = MODULE_FEATURE_LINKS[currentModule.id].filter(link => {
    if (isLimitedGestor && (link.path === '/dashboard' || link.path === '/financial' || link.path === '/reports')) {
      return false
    }
    return true
  })
  const primaryFeature = currentModuleFeatures[0]

  const accountLinks = [
    { path: '/settings', label: 'Definições', icon: Settings },
    ...(isAdmin && profile?.organization_id
      ? [{ path: `/settings/organizations/${profile.organization_id}/company-profile`, label: 'Dados da empresa', icon: Building2 }]
      : []),
    { path: '/settings/billing', label: 'Planos e Ferramentas', icon: CreditCard },
    { path: '/sync', label: 'Sincronização', icon: RefreshCw },
    { path: '/owners', label: 'Proprietários', icon: Users },
  ]

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

  useEffect(() => {
    if (!moreOpen) {
      setShowModuleSwitcher(false)
      setShowAccountLinks(false)
    }
  }, [moreOpen])

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-be-blue/10 pb-safe">
        <div className="flex items-stretch">
          {moduleLinks.map(({ href, label, icon, id }) => {
            const active = currentModule.id === id
            const Icon = icon
            return (
              <Link
                key={id}
                href={href}
                className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[64px] transition-all ${
                  active ? 'text-be-blue' : 'text-lodgra-blue/60 hover:bg-be-blue/10'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-[1px] leading-none font-[family-name:var(--font-hanken-grotesk)]">
                  {label}
                </span>
              </Link>
            )
          })}

          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[64px] transition-all text-lodgra-blue/60 hover:bg-be-blue/10"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[1px] leading-none font-[family-name:var(--font-hanken-grotesk)]">
              Mais
            </span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-none pb-safe border-t border-be-blue/10 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-left text-[14px] font-black text-lodgra-blue uppercase tracking-[2px] font-[family-name:var(--font-hanken-grotesk)]">
              {currentModule.label}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 pb-8">
            {primaryFeature && (
              <div>
                <p className="text-[10px] font-black text-lodgra-blue/30 uppercase tracking-[2px] mb-3 px-1 font-[family-name:var(--font-hanken-grotesk)]">
                  Acesso rápido
                </p>
                <Link
                  href={getLocalizedHref(prefix, primaryFeature.path)}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-be-blue bg-be-blue px-4 py-4 text-white shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <primaryFeature.icon className="h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase tracking-[1px] font-[family-name:var(--font-hanken-grotesk)]">
                        {primaryFeature.label}
                      </p>
                      <p className="text-[11px] text-white/80">
                        Abrir primeiro no mobile
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[1px] text-white/90">
                    Entrar
                  </span>
                </Link>
              </div>
            )}

            <div>
              <p className="text-[10px] font-black text-lodgra-blue/30 uppercase tracking-[2px] mb-3 px-1 font-[family-name:var(--font-hanken-grotesk)]">
                Módulo atual
              </p>
              <div className="grid grid-cols-1 gap-2">
                {currentModuleFeatures.map(({ path, label, icon }) => {
                  const href = getLocalizedHref(prefix, path)
                  const active = pathname === href || pathname.startsWith(`${href}/`)
                  return renderGridLink(href, label, icon, active, () => setMoreOpen(false))
                })}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowModuleSwitcher(value => !value)}
                className="flex w-full items-center justify-between px-1 py-2 text-left"
              >
                <p className="text-[10px] font-black text-lodgra-blue/30 uppercase tracking-[2px] font-[family-name:var(--font-hanken-grotesk)]">
                  Módulos
                </p>
                <ChevronDown className={`h-4 w-4 text-lodgra-blue/30 transition-transform ${showModuleSwitcher ? 'rotate-180' : ''}`} />
              </button>
              {showModuleSwitcher && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {moduleLinks.map(({ href, label, icon, id }) => {
                    const active = currentModule.id === id
                    return renderGridLink(href, label, icon, active, () => setMoreOpen(false))
                  })}
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowAccountLinks(value => !value)}
                className="flex w-full items-center justify-between px-1 py-2 text-left"
              >
                <p className="text-[10px] font-black text-lodgra-blue/30 uppercase tracking-[2px] font-[family-name:var(--font-hanken-grotesk)]">
                  Conta
                </p>
                <ChevronDown className={`h-4 w-4 text-lodgra-blue/30 transition-transform ${showAccountLinks ? 'rotate-180' : ''}`} />
              </button>
              {showAccountLinks && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {accountLinks.map(({ path, label, icon }) => {
                    const href = getLocalizedHref(prefix, path)
                    const active = pathname === href || pathname.startsWith(`${href}/`)
                    return renderGridLink(href, label, icon, active, () => setMoreOpen(false))
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-be-blue/10">
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
