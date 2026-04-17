'use client'

import { useLocale } from '@/lib/i18n/routing'
import { useRouter } from 'next/navigation'
import { localeLabels, locales } from '@/i18n.config'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/common/ui/select'

/**
 * Locale Selector Component
 * Allows users to switch between supported locales
 *
 * This is a placeholder for i18n.2 which will integrate
 * this selector into the header/nav
 */
export function LocaleSelector() {
  const locale = useLocale()
  const router = useRouter()

  const handleLocaleChange = (newLocale: string) => {
    // Extract current pathname and replace the locale
    const currentPath = window.location.pathname
    const pathSegments = currentPath.split('/')
    pathSegments[1] = newLocale // Replace locale segment
    const newPath = pathSegments.join('/')

    // Preserve search params and hash
    const search = window.location.search
    const hash = window.location.hash

    router.push(`${newPath}${search}${hash}`)
  }

  return (
    <Select value={locale} onValueChange={handleLocaleChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc}>
            {localeLabels[loc as typeof locales[number]]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
