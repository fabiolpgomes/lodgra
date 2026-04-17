import { redirect } from 'next/navigation'
import { defaultLocale } from '@/i18n.config'

/**
 * /register — Redirects to locale-specific register page, preserving search params
 */
export default async function RegisterRedirect({
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
  redirect(`/${defaultLocale}/register${query ? `?${query}` : ''}`)
}
