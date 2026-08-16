'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { SettingsSidebar } from './SettingsSidebar'

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  propertyId?: string
  calendarMonth?: number
  calendarYear?: number
  onUpdate?: () => Promise<void>
}

export function SettingsDrawer({
  isOpen,
  onClose,
  propertyId,
  calendarMonth,
  calendarYear,
  onUpdate,
}: SettingsDrawerProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Mobile Drawer (fullscreen) */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5DFD2] bg-[#FBFAF6] px-4 py-4">
          <h2 className="text-lg font-semibold text-[#1B2430]">Configurações</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#F0F0F0]"
            aria-label="Fechar configurações"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <SettingsSidebar
            propertyId={propertyId}
            calendarMonth={calendarMonth}
            calendarYear={calendarYear}
            onUpdate={onUpdate}
          />
        </div>
      </div>

      {/* Backdrop (mobile only) */}
      <div
        className="fixed inset-0 z-40 bg-black/20 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  )
}
