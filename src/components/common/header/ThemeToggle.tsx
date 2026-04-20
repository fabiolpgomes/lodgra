'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTransition } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [, startTransition] = useTransition()

  const isDark = theme === 'dark'

  const handleToggle = () => {
    startTransition(() => {
      setTheme(isDark ? 'light' : 'dark')
    })
  }

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      ) : (
        <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      )}
    </button>
  )
}
