'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export interface SidebarItem {
  label: string
  href: string
  icon?: LucideIcon
  active?: boolean
  badge?: string | number
}

export interface SidebarProps {
  items: SidebarItem[]
  brand?: {
    label: string
    icon?: React.ReactNode
  }
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
  footer?: React.ReactNode
}

export function Sidebar({
  items,
  brand,
  collapsed = false,
  footer,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-white border-r border-be-border/10',
        'transition-all duration-300 z-sidebar',
        'overflow-y-auto flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand */}
      {brand && (
        <div className="flex items-center gap-3 px-4 py-4 border-b border-be-border/10 flex-shrink-0">
          {brand.icon && <div className="flex-shrink-0">{brand.icon}</div>}
          {!collapsed && (
            <span className="font-heading font-black text-be-text uppercase text-design-sm">
              {brand.label}
            </span>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-sm transition-colors',
                'text-design-sm font-medium',
                item.active
                  ? 'bg-be-blue text-white font-bold'
                  : 'text-be-text hover:bg-be-blue/5'
              )}
              title={collapsed ? item.label : undefined}
            >
              {Icon && <Icon size={20} className="flex-shrink-0" />}
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-design-xs rounded-full px-2 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </a>
          )
        })}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="px-2 py-4 border-t border-be-border/10 flex-shrink-0">
          {footer}
        </div>
      )}
    </aside>
  )
}

Sidebar.displayName = 'Sidebar'
