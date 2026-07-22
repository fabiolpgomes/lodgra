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
            ? 'flex items-center justify-between px-4 py-3 sticky top-0 z-10'
            : 'p-6 flex items-center justify-between'
        }
      `}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={() => window.history.back()}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="font-semibold text-lg">{propertyName}</h1>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMonthPickerClick}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          title="Seletor de mês"
          aria-label="Seletor de mês"
        >
          <Calendar className="w-5 h-5 text-gray-600" />
        </button>

        <button
          onClick={onSettingsClick}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          title="Configurações"
          aria-label="Configurações"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </header>
  );
}
