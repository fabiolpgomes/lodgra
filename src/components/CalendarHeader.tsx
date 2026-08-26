/**
 * Story 36.9: Calendar Header
 * Mobile and web header with settings and month picker
 */

import React from 'react';
import { ChevronLeft, Settings, Calendar } from 'lucide-react';

interface CalendarHeaderProps {
  propertyName: string;
  onSettingsClick?: () => void;
  onMonthPickerClick?: () => void;
  isMobile?: boolean;
}

export function CalendarHeader({
  propertyName,
  onSettingsClick,
  onMonthPickerClick,
  isMobile = false,
}: CalendarHeaderProps) {
  return (
      <header
      className={`
        border-b border-gray-200 bg-white
        ${
          isMobile
            ? 'sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]'
            : 'flex items-center justify-between p-6'
        }
      `}
    >
      {/* Left section */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {isMobile && (
          <button
            onClick={() => window.history.back()}
            className="flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-gray-100"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="min-w-0 truncate text-base font-semibold sm:text-lg">{propertyName}</h1>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMonthPickerClick}
          className="flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-gray-100"
          title="Seletor de mês"
          aria-label="Seletor de mês"
        >
          <Calendar className="w-5 h-5 text-gray-600" />
        </button>

        <button
          onClick={onSettingsClick}
          className="flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-gray-100"
          title="Configurações"
          aria-label="Configurações"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </header>
  );
}
