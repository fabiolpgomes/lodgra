'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { CreditCard, MoreHorizontal, LogOut, RefreshCw, Settings, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isRestrictedGestor } from '@/lib/auth/permissions'
import { useLocale } from '@/lib/i18n/routing'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/common/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { useFeatureAccess } from '@/lib/features/featureGate'
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

export function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { profile } = useAuth()
  const locale = useLocale()
  const isAdmin = profile?.role === 'admin'
  const isLimitedGestor = isRestrictedGestor(profile)
  const [moreOpen, setMoreOpen] = useState(false)

  const prefix = locale ? `/${locale}` : ''
  const currentModule = getModuleForPath(pathname)
  const organizationId = profile?.organization_id ?? null
  const { hasAccess: hasIaNativeAccess, loading: iaNativeLoading } = useFeatureAccess(
    'property_intelligence',
    organizationId ?? undefined
  )
  const moduleLinks = getModuleNavLinks(prefix).filter(link => {
    if (link.id === 'ia-native' && (iaNativeLoading || !hasIaNativeAccess)) {
      return false
    }

    return !isLimitedGestor || (link.id !== 'core' && link.id !== 'empresa')
  })
  const currentModuleFeatures = MODULE_FEATURE_LINKS[currentModule.id].filter(link => {
    if (isLimitedGestor && (link.path === '/dashboard' || link.path === '/financial' || link.path === '/reports')) {
      return false
    }
    return true
  })

  const accountLinks = [
    { path: '/settings', label: 'Definições', icon: Settings },
    { path: '/settings/billing', label: 'Planos & Faturamento', icon: CreditCard },
    { path: '/sync', label: 'Sincronização', icon: RefreshCw },
    { path: '/owners', label: 'Proprietários', icon: Users },
    ...(isAdmin ? [{ path: '/admin/users', label: 'Usuários', icon: Users }] : []),
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
        <SheetContent side="bottom" className="rounded-none pb-safe border-t border-be-blue/10">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-left text-[14px] font-black text-lodgra-blue uppercase tracking-[2px] font-[family-name:var(--font-hanken-grotesk)]">
              {currentModule.label}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 pb-8">
            <div>
              <p className="text-[10px] font-black text-lodgra-blue/30 uppercase tracking-[2px] mb-3 px-1 font-[family-name:var(--font-hanken-grotesk)]">
                Módulo
              </p>
              <div className="grid grid-cols-2 gap-2">
                {currentModuleFeatures.map(({ path, label, icon }) => {
                  const href = getLocalizedHref(prefix, path)
                  const active = pathname === href || pathname.startsWith(`${href}/`)
                  return renderGridLink(href, label, icon, active, () => setMoreOpen(false))
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-lodgra-blue/30 uppercase tracking-[2px] mb-3 px-1 font-[family-name:var(--font-hanken-grotesk)]">
                Módulos
              </p>
              <div className="grid grid-cols-2 gap-2">
                {moduleLinks.map(({ href, label, icon, id }) => {
                  const active = currentModule.id === id
                  return renderGridLink(href, label, icon, active, () => setMoreOpen(false))
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-lodgra-blue/30 uppercase tracking-[2px] mb-3 px-1 font-[family-name:var(--font-hanken-grotesk)]">
                Conta
              </p>
              <div className="grid grid-cols-2 gap-2">
                {accountLinks.map(({ path, label, icon }) => {
                  const href = getLocalizedHref(prefix, path)
                  const active = pathname === href || pathname.startsWith(`${href}/`)
                  return renderGridLink(href, label, icon, active, () => setMoreOpen(false))
                })}
              </div>
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
