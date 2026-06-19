'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface PropertyFilterProps {
  properties: Array<{ id: string; name: string }>
  value: string
  onChange: (propertyId: string) => void
}

export function PropertyFilter({ properties, value, onChange }: PropertyFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedName = value
    ? properties.find(p => p.id === value)?.name
    : 'Todos imóveis'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 whitespace-nowrap"
      >
        {selectedName}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 z-50 min-w-max">
          <button
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
            className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
              !value
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700'
            }`}
          >
            Todos imóveis
          </button>

          <div className="border-t border-gray-200 dark:border-zinc-700" />

          {properties.map(property => (
            <button
              key={property.id}
              onClick={() => {
                onChange(property.id)
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                value === property.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700'
              }`}
            >
              {property.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
