import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 text-sm text-gray-600 mb-6 ${className}`}
    >
      {/* Home Link */}
      <Link href="/" className="hover:text-gray-900 transition-colors">
        Home
      </Link>

      {/* Breadcrumb Items */}
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />

          {item.current || !item.href ? (
            <span className="text-gray-900 font-medium">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

/**
 * Common breadcrumb paths for Docs section
 */
export const docsBreadcrumbs = {
  root: [{ label: 'Documentação', href: '/docs', current: true }],
  gettingStarted: [
    { label: 'Documentação', href: '/docs' },
    { label: 'Começar', current: true },
  ],
  features: [
    { label: 'Documentação', href: '/docs' },
    { label: 'Funcionalidades', current: true },
  ],
  api: [
    { label: 'Documentação', href: '/docs' },
    { label: 'API', current: true },
  ],
} as const
