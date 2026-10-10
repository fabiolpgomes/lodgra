'use client'

import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { LogOut } from 'lucide-react'
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
  getVisibleModuleFeatureLinks,
  getVisibleModuleNavLinks,
  type ModuleNavigationEntry,
} from '@/lib/navigation/module-shell'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  manager: 'Gestor',
  viewer: 'Leitura',
  owner: 'Proprietário',
}

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

function moduleClassName(active: boolean) {
  return `flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold tracking-normal transition-all ${
    active
      ? 'bg-[#10203E] !text-white shadow-sm'
      : 'text-[#10203E] hover:bg-card'
  }`
}

/** Link ativo = o mais específico que corresponde ao caminho (ex.: /settings/payments, não /settings). */
function activeFeatureHref(prefix: string, pathname: string, links: ModuleNavigationEntry[]) {
  return links
    .map(link => getLocalizedHref(prefix, link.path))
    .filter(href => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]
}

function renderFeatureLink(
  prefix: string,
  activeHref: string | undefined,
  link: ModuleNavigationEntry
) {
  const href = getLocalizedHref(prefix, link.path)
  const active = href === activeHref
  const Icon = link.icon

  return (
    <Link key={link.path} href={href} className={navClassName(active)}>
      <Icon className="h-4 w-4 shrink-0" />
      {link.label}
    </Link>
  )
}

export function Sidebar({ serverProfile }: SidebarProps) {
  const { profile: clientProfile } = useAuth({ enabled: !serverProfile })
  const profile = serverProfile || clientProfile
  const pathname = usePathname()
  const locale = useLocale()
  const router = useRouter()
  const { resolvedTheme, theme } = useTheme()
  const [hasPremium, setHasPremium] = useState(false)
  const isPlatformAdmin = usePlatformAdmin(profile?.id)

  const isAdmin = profile?.role === 'admin'
  const isLimitedGestor = isRestrictedGestor(profile)
  const prefix = locale ? `/${locale}` : ''
  const isDarkMode = (resolvedTheme || theme) === 'dark'
  const currentModule = getModuleForPath(pathname)
  const moduleLinks = getVisibleModuleNavLinks(prefix, isLimitedGestor)

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
          setHasPremium(plan === 'premium' || plan === 'enterprise')
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

  const featureLinks = getVisibleModuleFeatureLinks(currentModule.id, isLimitedGestor, {
    isAdmin,
    hasPremium,
    isPlatformAdmin,
    organizationId: profile?.organization_id ?? null,
  })
  const activeHref = activeFeatureHref(prefix, pathname, featureLinks)

  return (
    <>
      <aside
        data-theme={isDarkMode ? 'dark' : 'light'}
        className="lodgra-sidebar hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 bg-be-surface border-r border-be-border"
        style={{ width: '260px' }}
      >
        <div className="px-6 py-5 bg-be-surface border-b border-be-border flex items-center justify-center">
          <Link href={prefix || '/'} className="flex items-center">
            <Logo size="lg" />
          </Link>
        </div>

        <div className="border-b border-be-border px-4 py-4">
          <p className="px-3 mb-2 text-[12px] font-semibold tracking-normal text-be-text-muted">
            Módulos
          </p>
          <div className="space-y-1">
            {moduleLinks.map(({ href, label, scopeLabel, icon: Icon, id }) => {
              const active = currentModule.id === id

              return (
                <Link key={id} href={href} className={moduleClassName(active)} title={scopeLabel} aria-current={active ? 'page' : undefined}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                  {id === 'ia-native' && (
                    <span className="rounded-full bg-be-blue/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[1.6px] text-be-blue">
                      IA
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          <div>
            <p className="px-2 mb-3 text-[12px] font-semibold tracking-normal text-be-text-muted">
              {currentModule.label}
            </p>
            <div className="space-y-2">
              {featureLinks.map(link => renderFeatureLink(prefix, activeHref, link))}
            </div>
          </div>
        </nav>

        <div className="px-4 py-6 border-t border-be-border space-y-4 bg-be-surface">
          <div className="flex items-center gap-3 px-2 py-3 bg-card border border-be-border rounded-md">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-semibold text-white shrink-0 bg-[#10203E]">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-be-text truncate tracking-normal">
                {profile?.full_name || profile?.email || 'A carregar…'}
              </p>
              <p className="text-[12px] text-be-text-muted font-normal tracking-normal">{profile ? (ROLE_LABELS[profile.role] ?? profile.role) : ''}</p>
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
