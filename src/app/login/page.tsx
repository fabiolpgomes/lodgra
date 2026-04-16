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
  const query = new URLSearchParams(params as any).toString()
  redirect(`/${defaultLocale}/login${query ? `?${query}` : ''}`)
}
