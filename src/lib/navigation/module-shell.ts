import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Building2,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckSquare,
  CreditCard,
  Home,
  FileText,
  Receipt,
  RefreshCw,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'

export type ModuleId = 'core' | 'operacao' | 'empresa' | 'proprietario' | 'ia-native'

export type ModuleNavigationEntry = {
  path: string
  label: string
  icon: LucideIcon
}

export type ModuleDefinition = {
  id: ModuleId
  label: string
  scopeLabel: string
  description: string
  icon: LucideIcon
  published: boolean
  entryPath: string | null
  matches: string[]
}

export const PUBLIC_MODULES: ModuleDefinition[] = [
  {
    id: 'operacao',
    label: 'Operação',
    scopeLabel: 'Execução do portfólio',
    description: 'Dashboard, reservas, calendário, despesas, limpeza e propriedades.',
    icon: Building2,
    published: true,
    entryPath: '/dashboard',
    matches: ['/dashboard', '/dashboard/reports', '/properties', '/reservations', '/calendar', '/cleaning', '/expenses', '/reports/reservas'],
  },
  {
    id: 'empresa',
    label: 'Empresa',
    scopeLabel: 'Gestão financeira',
    description: 'Visão financeira, repasses, contas e relatórios gerenciais.',
    icon: BarChart3,
    published: true,
    entryPath: '/dashboard/empresa',
    matches: ['/dashboard/empresa', '/dashboard/empresa/custos', '/financial', '/reports', '/reports/financeiro'],
  },
  {
    id: 'ia-native',
    label: 'IA Native',
    scopeLabel: 'Inteligência do imóvel',
    description: 'Property Intelligence e biblioteca de apoio.',
    icon: TrendingUp,
    published: true,
    entryPath: '/ia-native',
    matches: ['/ia-native', '/ia-native/analyze', '/property-intelligence', '/docs'],
  },
  {
    id: 'core',
    label: 'Core',
    scopeLabel: 'Configuração e acesso',
    description: 'Definições, planos, sincronização, utilizadores e integrações.',
    icon: Settings,
    published: true,
    entryPath: '/settings',
    matches: ['/settings', '/dashboard/settings', '/billing', '/account', '/admin', '/sync', '/settings/organizations'],
  },
  {
    id: 'proprietario',
    label: 'Proprietário',
    scopeLabel: 'Painel do proprietário',
    description: 'Visão por imóvel, repasses e histórico.',
    icon: Users,
    published: true,
    entryPath: '/owners',
    matches: ['/owners'],
  },
]

export const MODULE_FEATURE_LINKS: Record<ModuleId, ModuleNavigationEntry[]> = {
  operacao: [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/reservations', label: 'Reservas', icon: Calendar },
    { path: '/calendar', label: 'Calendário', icon: CalendarDays },
    { path: '/expenses', label: 'Despesas', icon: Receipt },
    { path: '/cleaning', label: 'Limpeza', icon: CheckSquare },
    { path: '/properties', label: 'Propriedades', icon: Building2 },
    { path: '/reports/reservas', label: 'Relatórios', icon: FileText },
  ],
  empresa: [
    { path: '/dashboard/empresa', label: 'Visão financeira', icon: BarChart3 },
    { path: '/dashboard/empresa/custos', label: 'Prestação de contas', icon: Receipt },
    { path: '/financial', label: 'Faturamento', icon: TrendingUp },
    { path: '/reports/financeiro', label: 'Relatórios gerenciais', icon: BarChart3 },
  ],
  'ia-native': [
    { path: '/ia-native/analyze', label: 'Property Intelligence', icon: Sparkles },
    { path: '/ia-native', label: 'Visão geral', icon: Sparkles },
    { path: '/docs', label: 'Biblioteca do Lodgra', icon: BookOpen },
  ],
  core: [
    { path: '/settings', label: 'Definições', icon: Settings },
    { path: '/settings/billing', label: 'Planos e Ferramentas', icon: CreditCard },
    { path: '/sync', label: 'Sincronização', icon: RefreshCw },
    { path: '/admin/google-distribution', label: 'Google Distribution', icon: TrendingUp },
  ],
  proprietario: [
    { path: '/owners', label: 'Proprietários', icon: Users },
  ],
}

export function stripLocalePrefix(pathname: string) {
  const normalized = pathname.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/|$)/, '')
  return normalized || '/'
}

export function getLocalizedHref(prefix: string, path: string) {
  if (path === '/docs') return '/docs'
  return path === '/' ? (prefix || '/') : `${prefix}${path}`
}

export function getModuleForPath(pathname: string): ModuleDefinition {
  const normalized = stripLocalePrefix(pathname)
  const matchedModules = PUBLIC_MODULES
    .filter(module => module.published)
    .flatMap(module =>
      module.matches
        .filter(match => normalized === match || normalized.startsWith(`${match}/`))
        .map(match => ({
          module,
          matchLength: match.length,
        }))
    )

  const bestMatch = matchedModules.sort((a, b) => b.matchLength - a.matchLength)[0]

  return bestMatch?.module || PUBLIC_MODULES[0]
}

export function getModuleNavLinks(prefix: string) {
  return PUBLIC_MODULES.filter(module => module.published && module.entryPath).map(module => ({
    href: getLocalizedHref(prefix, module.entryPath!),
    label: module.label,
    scopeLabel: module.scopeLabel,
    icon: module.icon,
    id: module.id,
  }))
}

export function getVisibleModuleNavLinks(prefix: string, isLimitedGestor: boolean) {
  return getModuleNavLinks(prefix).filter(link => {
    return !isLimitedGestor || (link.id !== 'core' && link.id !== 'empresa')
  })
}

export function getVisibleModuleFeatureLinks(moduleId: ModuleId, isLimitedGestor: boolean) {
  return MODULE_FEATURE_LINKS[moduleId].filter(link => {
    if (!isLimitedGestor) {
      return true
    }

    return !(link.path === '/dashboard' || link.path === '/financial' || link.path === '/reports')
  })
}

export function getPageTitle(pathname: string): string {
  const normalized = stripLocalePrefix(pathname)

  if (normalized.startsWith('/dashboard/settings/billing')) return 'Planos e Ferramentas'
  if (normalized.startsWith('/dashboard/settings')) return 'Definições'
  if (normalized.startsWith('/settings/organizations')) return 'Dados da empresa'
  if (normalized === '/' || normalized === '/dashboard') return 'Dashboard'
  if (normalized.startsWith('/dashboard/empresa/custos')) return 'Prestação de contas'
  if (normalized.startsWith('/dashboard/empresa')) return 'Empresa'
  if (normalized.startsWith('/dashboard/reports') || normalized.startsWith('/reports/reservas')) return 'Relatórios operacionais'
  if (normalized.startsWith('/reports/financeiro') || normalized === '/reports') return 'Relatórios gerenciais'
  if (normalized.startsWith('/ia-native/analyze') || normalized.startsWith('/property-intelligence')) return 'Property Intelligence'
  if (normalized.startsWith('/ia-native')) return 'IA Native'
  if (normalized.startsWith('/docs')) return 'Biblioteca do Lodgra'
  if (normalized.startsWith('/properties')) return 'Propriedades'
  if (normalized.startsWith('/reservations')) return 'Reservas'
  if (normalized.startsWith('/settings/billing')) return 'Planos e Ferramentas'
  if (normalized.startsWith('/expenses')) return 'Despesas'
  if (normalized.startsWith('/cleaning')) return 'Limpeza'
  if (normalized.startsWith('/financial')) return 'Visão financeira'
  if (normalized.startsWith('/calendar')) return 'Calendário'
  if (normalized.startsWith('/owners')) return 'Proprietários'
  if (normalized.startsWith('/sync')) return 'Sincronização'
  if (normalized.startsWith('/settings')) return 'Definições'
  if (normalized.startsWith('/admin/google-distribution')) return 'Google Distribution'
  if (normalized.startsWith('/admin/users')) return 'Usuários'
  return ''
}

export function getModuleSummary(pathname: string) {
  const module = getModuleForPath(pathname)
  return {
    label: module.label,
    scopeLabel: module.scopeLabel,
    description: module.description,
    published: module.published,
  }
}
