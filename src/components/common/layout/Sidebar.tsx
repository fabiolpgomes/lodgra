'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  CreditCard,
  Globe,
  LogOut,
  RefreshCw,
  Settings,
  Users,
} from 'lucide-react'
import { Logo } from '@/components/common/ui/Logo'
import { useAuth } from '@/hooks/useAuth'
import { isRestrictedGestor } from '@/lib/auth/permissions'
import { useLocale } from '@/lib/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserProfile } from '@/lib/auth/getUserAccess'
import {
  getLocalizedHref,
  getModuleForPath,
  getModuleNavLinks,
  MODULE_FEATURE_LINKS,
  type ModuleNavigationEntry,
} from '@/lib/navigation/module-shell'

interface SidebarProps {
  serverProfile?: UserProfile
}

function navClassName(active: boolean) {
  return `flex items-center gap-3 rounded-full px-4 py-3 text-[14px] font-medium tracking-normal transition-all ${
    active
      ? 'bg-[#10203E] !text-white shadow-sm'
      : 'text-[#10203E] hover:bg-be-surface hover:text-[#10203E]'
  }`
}

function cardClassName(active: boolean) {
  return `flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all ${
    active
      ? 'border-[#10203E] bg-[#10203E] !text-white shadow-sm'
      : 'border-be-border bg-card text-[#10203E] hover:border-be-blue/30 hover:bg-be-surface'
  }`
}

function renderFeatureLink(
  prefix: string,
  pathname: string,
  link: ModuleNavigationEntry
) {
  const href = getLocalizedHref(prefix, link.path)
  const active = pathname === href || pathname.startsWith(`${href}/`)
  const Icon = link.icon

  return (
    <Link key={link.path} href={href} className={navClassName(active)}>
      <Icon className="h-4 w-4 shrink-0" />
      {link.label}
    </Link>
  )
}

export function Sidebar({ serverProfile }: SidebarProps) {
  const { profile: clientProfile } = useAuth()
  const profile = serverProfile || clientProfile
  const pathname = usePathname()
  const locale = useLocale()
  const router = useRouter()
  const { resolvedTheme, theme } = useTheme()
  const [hasPremium, setHasPremium] = useState(false)

  const isAdmin = profile?.role === 'admin'
  const isLimitedGestor = isRestrictedGestor(profile)
  const prefix = locale ? `/${locale}` : ''
  const isDarkMode = (resolvedTheme || theme) === 'dark'
  const currentModule = getModuleForPath(pathname)
  const moduleLinks = getModuleNavLinks(prefix).filter(link => {
    return !isLimitedGestor || (link.id !== 'core' && link.id !== 'empresa')
  })
  const featureLinks = MODULE_FEATURE_LINKS[currentModule.id].filter(link => {
    if (isLimitedGestor && (link.path === '/dashboard' || link.path === '/financial' || link.path === '/reports')) {
      return false
    }
    return true
  })

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

        if (!userProfile?.organization_id) {
          setHasPremium(false)
          return
        }

        try {
          const { data: organization } = await supabase
            .from('organizations')
            .select('plan, subscription_plan')
            .eq('id', userProfile.organization_id)
            .single()

          const plan = organization?.subscription_plan || organization?.plan
          setHasPremium(plan === 'premium')
        } catch {
          setHasPremium(false)
        }
      } catch (error) {
        console.error('Error checking premium tier:', error)
        setHasPremium(false)
      }
    }

    checkPremiumTier()
  }, [profile?.id])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase()
    : profile?.email?.[0]?.toUpperCase() ?? 'U'

  const accountShortcuts = [
    { href: `${prefix}/settings`, label: 'Definições', icon: Settings },
    { href: `${prefix}/settings/billing`, label: 'Planos & Faturamento', icon: CreditCard },
    { href: `${prefix}/sync`, label: 'Sincronização', icon: RefreshCw },
    { href: `${prefix}/owners`, label: 'Proprietários', icon: Users },
    ...(isAdmin ? [{ href: `${prefix}/admin/users`, label: 'Usuários', icon: Users }] : []),
    ...(hasPremium ? [{ href: `${prefix}/admin/google-distribution`, label: 'Google Distribution', icon: Globe }] : []),
  ]

  return (
    <>
      <aside
        data-theme={isDarkMode ? 'dark' : 'light'}
        className="lodgra-sidebar hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 bg-be-surface border-r border-be-border"
        style={{ width: '260px' }}
      >
        <div className="px-6 py-8 bg-be-surface border-b border-be-border flex items-center justify-center">
          <Link href={prefix || '/'} className="flex items-center">
            <Logo size="lg" />
          </Link>
        </div>

        <div className="border-b border-be-border px-4 py-6">
          <p className="px-2 mb-4 text-[12px] font-semibold tracking-normal text-be-text-muted">
            Módulos
          </p>
          <div className="space-y-2">
            {moduleLinks.map(({ href, label, scopeLabel, icon: Icon, id }) => {
              const active = currentModule.id === id

              return (
                <Link key={id} href={href} className={cardClassName(active)}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-semibold tracking-normal">{label}</div>
                      {id === 'ia-native' && (
                        <span className="rounded-full bg-be-blue/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[1.6px] text-be-blue">
                          IA
                        </span>
                      )}
                    </div>
                    <div
                      className="text-[11px] leading-tight"
                      style={active ? { color: 'rgba(255, 255, 255, 0.8)' } : undefined}
                    >
                      {scopeLabel}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <div>
            <p className="px-2 mb-3 text-[12px] font-semibold tracking-normal text-be-text-muted">
              {currentModule.label}
            </p>
            <div className="space-y-2">
              {featureLinks.map(link => renderFeatureLink(prefix, pathname, link))}
            </div>
          </div>

          <div>
            <p className="px-2 mb-3 text-[12px] font-semibold tracking-normal text-be-text-muted">
              Atalhos da conta
            </p>
            <div className="space-y-2">
              {accountShortcuts.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`)

                return (
                  <Link key={href} href={href} className={navClassName(active)} aria-current={active ? 'page' : undefined}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="px-4 py-6 border-t border-be-border space-y-4 bg-be-surface">
          <div className="flex items-center gap-3 px-2 py-3 bg-card border border-be-border rounded-md">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-semibold text-white shrink-0 bg-be-blue">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-be-text truncate tracking-normal">
                {profile?.full_name || profile?.email || 'Usuário'}
              </p>
              <p className="text-[12px] text-be-text-muted font-normal tracking-normal">{profile?.role || 'user'}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-be-text-muted hover:text-be-blue hover:bg-be-surface transition-all rounded-full"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
