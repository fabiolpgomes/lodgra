'use client'

import { useParams as useNextParams, useSearchParams, useRouter as useNextRouter } from 'next/navigation'

/**
 * Hook to get locale-aware router
 * Automatically prepends locale to all push/replace calls
 */
export function useRouter() {
  const nextRouter = useNextRouter()
  const params = useNextParams()
  const locale = params?.locale as string | undefined

  return {
    ...nextRouter,
    push: (path: string) => {
      // If path starts with /, prepend locale
      if (path.startsWith('/') && locale && !path.startsWith(`/${locale}`)) {
        nextRouter.push(`/${locale}${path}`)
      } else {
        nextRouter.push(path)
      }
    },
    replace: (path: string) => {
      // If path starts with /, prepend locale
      if (path.startsWith('/') && locale && !path.startsWith(`/${locale}`)) {
        nextRouter.replace(`/${locale}${path}`)
      } else {
        nextRouter.replace(path)
      }
    },
    prefetch: (path: string) => {
      // If path starts with /, prepend locale
      if (path.startsWith('/') && locale && !path.startsWith(`/${locale}`)) {
        nextRouter.prefetch(`/${locale}${path}`)
      } else {
        nextRouter.prefetch(path)
      }
    },
  }
}

/**
 * Helper to get the current locale from params
 */
export function useLocale() {
  const params = useNextParams()
  return params?.locale as string | undefined
}

/**
 * Re-export useParams from next/navigation for compatibility
 * Supports generic type parameter for params
 */
export function useParams<T extends Record<string, string | string[]>>(): T {
  return useNextParams() as T
}

/**
 * Re-export useSearchParams from next/navigation for compatibility
 */
export { useSearchParams }

/**
 * Helper to create locale-prefixed paths
 */
export function getLocalizedPath(path: string, locale: string): string {
  if (path.startsWith('/')) {
    if (path.startsWith(`/${locale}`)) {
      return path // Already localized
    }
    return `/${locale}${path}`
  }
  return `/${locale}/${path}`
}
