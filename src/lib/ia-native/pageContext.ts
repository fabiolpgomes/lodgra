import type { UserProfile } from '@/lib/auth/getUserAccess'
import { CURRENCIES, type CurrencyCode } from '@/lib/utils/currency'

export type IaNativeAuthContext = {
  userId: string
  role: string
  accessAllProperties: boolean
  organizationId?: string | null
}

export type IaNativeProfileRow = {
  id?: string | null
  email?: string | null
  full_name?: string | null
  role?: string | null
  avatar_url?: string | null
  access_all_properties?: boolean | null
  organization_id?: string | null
}

export type IaNativeOrganizationRow = {
  name?: string | null
  currency?: string | null
  timezone?: string | null
  subscription_plan?: string | null
  plan?: string | null
}

export type IaNativeBrandingRow = {
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
}

export type IaNativePublicProfileRow = {
  contact_email?: string | null
  contact_phone?: string | null
  whatsapp_number?: string | null
  website_url?: string | null
}

type BuildIaNativeContextInput = {
  auth: IaNativeAuthContext
  fallbackRole: UserProfile['role']
  profileRow?: IaNativeProfileRow | null
  organizationRow?: IaNativeOrganizationRow | null
  brandingRow?: IaNativeBrandingRow | null
  publicProfileRow?: IaNativePublicProfileRow | null
}

export function buildIaNativePageContext({
  auth,
  fallbackRole,
  profileRow,
  organizationRow,
  brandingRow,
  publicProfileRow,
}: BuildIaNativeContextInput) {
  const currentPlan = organizationRow?.subscription_plan || organizationRow?.plan || 'essencial'
  const organizationCurrency = organizationRow?.currency?.toUpperCase() ?? null
  const safeCurrency = (organizationCurrency && organizationCurrency in CURRENCIES
    ? organizationCurrency
    : null) as CurrencyCode | null
  const businessTimeZone = organizationRow?.timezone || 'Europe/Lisbon'

  const userProfile: UserProfile = {
    id: profileRow?.id ?? auth.userId,
    email: profileRow?.email ?? '',
    full_name: profileRow?.full_name ?? null,
    role: (profileRow?.role as UserProfile['role']) ?? fallbackRole,
    avatar_url: profileRow?.avatar_url ?? null,
    access_all_properties: profileRow?.access_all_properties ?? auth.accessAllProperties,
    organization_id: profileRow?.organization_id ?? auth.organizationId,
  }

  const companyInfo = {
    name: organizationRow?.name?.trim() || null,
    logoUrl: brandingRow?.logo_url ?? null,
    websiteUrl: publicProfileRow?.website_url ?? null,
    email: publicProfileRow?.contact_email ?? null,
    phone: publicProfileRow?.contact_phone ?? null,
    whatsappNumber: publicProfileRow?.whatsapp_number ?? null,
    primaryColor: brandingRow?.primary_color ?? null,
    secondaryColor: brandingRow?.secondary_color ?? null,
  }

  return {
    currentPlan,
    organizationCurrency,
    safeCurrency,
    businessTimeZone,
    userProfile,
    companyInfo,
  }
}
