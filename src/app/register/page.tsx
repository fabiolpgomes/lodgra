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
  const query = new URLSearchParams(params as any).toString()
  redirect(`/${defaultLocale}/register${query ? `?${query}` : ''}`)
}
