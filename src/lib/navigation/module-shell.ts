import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  CheckSquare,
  CreditCard,
  Home,
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
    id: 'core',
    label: 'Core',
    scopeLabel: 'Base da plataforma',
    description: 'Autenticação, contexto e navegação base.',
    icon: Home,
    published: true,
    entryPath: '/dashboard',
    matches: ['/dashboard', '/settings', '/billing', '/account', '/admin', '/sync'],
  },
  {
    id: 'operacao',
    label: 'Operação',
    scopeLabel: 'Operação do portfólio',
    description: 'Propriedades, reservas, calendário e execução diária.',
    icon: Building2,
    published: true,
    entryPath: '/properties',
    matches: ['/properties', '/reservations', '/calendar', '/cleaning', '/expenses'],
  },
  {
    id: 'empresa',
    label: 'Empresa',
    scopeLabel: 'Visão executiva',
    description: 'Receita consolidada, custos e rentabilidade.',
    icon: BarChart3,
    published: true,
    entryPath: '/dashboard/empresa',
    matches: ['/dashboard/empresa', '/financial', '/reports'],
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
  {
    id: 'ia-native',
    label: 'IA Native',
    scopeLabel: 'Capability integrada',
    description: 'Viabilidade de propriedades e retorno esperado.',
    icon: TrendingUp,
    published: true,
    entryPath: '/ia-native',
    matches: ['/ia-native', '/property-intelligence'],
  },
]

export const MODULE_FEATURE_LINKS: Record<ModuleId, ModuleNavigationEntry[]> = {
  core: [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/settings', label: 'Definições', icon: Settings },
    { path: '/settings/billing', label: 'Planos & Faturamento', icon: CreditCard },
    { path: '/sync', label: 'Sincronização', icon: RefreshCw },
    { path: '/admin/users', label: 'Usuários', icon: Users },
  ],
  operacao: [
    { path: '/properties', label: 'Propriedades', icon: Building2 },
    { path: '/reservations', label: 'Reservas', icon: Calendar },
    { path: '/calendar', label: 'Calendário', icon: CalendarDays },
    { path: '/cleaning', label: 'Limpezas', icon: CheckSquare },
    { path: '/expenses', label: 'Despesas', icon: Receipt },
  ],
  empresa: [
    { path: '/dashboard/empresa', label: 'Empresa', icon: BarChart3 },
    { path: '/dashboard/empresa/custos', label: 'Custos Empresa', icon: Receipt },
    { path: '/financial', label: 'Financeiro', icon: TrendingUp },
    { path: '/reports', label: 'Relatórios', icon: BarChart3 },
  ],
  proprietario: [
    { path: '/owners', label: 'Proprietários', icon: Users },
  ],
  'ia-native': [
    { path: '/ia-native', label: 'Visão geral', icon: Sparkles },
  ],
}

export function stripLocalePrefix(pathname: string) {
  const normalized = pathname.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/|$)/, '')
  return normalized || '/'
}

export function getLocalizedHref(prefix: string, path: string) {
  return path === '/' ? (prefix || '/') : `${prefix}${path}`
}

export function getModuleForPath(pathname: string): ModuleDefinition {
  const normalized = stripLocalePrefix(pathname)
  return (
    PUBLIC_MODULES.find(module => module.published && module.matches.some(match => normalized === match || normalized.startsWith(`${match}/`))) ||
    PUBLIC_MODULES[0]
  )
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

export function getPageTitle(pathname: string): string {
  const normalized = stripLocalePrefix(pathname)

  if (normalized === '/' || normalized === '/dashboard') return 'Dashboard'
  if (normalized.startsWith('/dashboard/empresa')) return 'Empresa'
  if (normalized.startsWith('/ia-native') || normalized.startsWith('/property-intelligence')) return 'Property Intelligence'
  if (normalized.startsWith('/properties')) return 'Propriedades'
  if (normalized.startsWith('/reservations')) return 'Reservas'
  if (normalized.startsWith('/expenses')) return 'Despesas'
  if (normalized.startsWith('/financial')) return 'Financeiro'
  if (normalized.startsWith('/calendar')) return 'Calendário'
  if (normalized.startsWith('/reports')) return 'Relatórios'
  if (normalized.startsWith('/owners')) return 'Proprietários'
  if (normalized.startsWith('/sync')) return 'Sincronização'
  if (normalized.startsWith('/settings')) return 'Definições'
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
