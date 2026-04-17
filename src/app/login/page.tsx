import { redirect } from 'next/navigation'
import { defaultLocale } from '@/i18n.config'

/**
 * /login — Redirects to locale-specific login page, preserving search params
 */
export default async function LoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const query = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (Array.isArray(value)) acc[key] = value[0] || ''
      else if (value) acc[key] = value
      return acc
    }, {} as Record<string, string>)
  ).toString()
  redirect(`/${defaultLocale}/login${query ? `?${query}` : ''}`)
}
