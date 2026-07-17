'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface DropdownItem {
  label: string
  value: string
  icon?: React.ReactNode
  divider?: boolean
  disabled?: boolean
}

export interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  onSelect?: (value: string) => void
  align?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
}

export function Dropdown({
  trigger,
  items,
  onSelect,
  align = 'left',
  size = 'md',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (value: string) => {
    onSelect?.(value)
    setIsOpen(false)
  }

  const widthClasses = {
    sm: 'w-40',
    md: 'w-48',
    lg: 'w-56',
  }

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {trigger}
        {typeof trigger === 'string' && <ChevronDown size={16} className={cn('transition-transform', isOpen && 'rotate-180')} />}
      </button>

      {/* Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-2 z-dropdown',
            widthClasses[size],
            alignClasses[align],
            'bg-white border border-be-border/10 rounded-sm shadow-lg'
          )}
          role="menu"
        >
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.divider ? (
                <div className="h-px bg-be-blue/10" />
              ) : (
                <button
                  onClick={() => handleSelect(item.value)}
                  disabled={item.disabled}
                  className={cn(
                    'w-full px-4 py-3 text-left text-design-sm flex items-center gap-3 transition-colors',
                    item.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-be-blue/5 text-be-text'
                  )}
                  role="menuitem"
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

Dropdown.displayName = 'Dropdown'
