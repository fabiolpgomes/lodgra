/**
 * Story 36.3: Calendar Grid Component
 * Renders the grid of days for a month
 */

import React from 'react';
import { CalendarDay, DailyPrice } from '@/types/calendar.types';
import { PriceIndicator } from './PriceIndicator';

interface CalendarGridProps {
  days: CalendarDay[];
  onDateClick: (date: Date, event?: React.MouseEvent) => void;
  selectedDate?: Date | null;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  isSelectingRange?: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarGrid({
  days,
  onDateClick,
  selectedDate,
  rangeStart,
  rangeEnd,
  isSelectingRange = false,
}: CalendarGridProps) {
  const isInRange = (day: CalendarDay): boolean => {
    if (!rangeStart || !rangeEnd) return false;
    const dayDate = new Date(day.date);
    return dayDate >= rangeStart && dayDate <= rangeEnd;
  };

  const isSelected = (day: CalendarDay): boolean => {
    if (!selectedDate) return false;
    const dayDate = new Date(day.date);
    return (
      dayDate.toDateString() === selectedDate.toDateString()
    );
  };

  const getCellColor = (day: CalendarDay): string => {
    if (!day.isCurrentMonth) {
      return 'bg-gray-50 text-gray-400';
    }

    if (isInRange(day)) {
      return 'bg-blue-100 border-blue-300';
    }

    if (isSelected(day)) {
      return 'bg-blue-200 border-blue-400';
    }

    switch (day.priceType) {
      case 'override':
        return 'bg-red-50 hover:bg-red-100 border-red-300';
      case 'weekend':
        return 'bg-amber-50 hover:bg-amber-100 border-amber-300';
      case 'disabled':
        return 'bg-gray-50 text-gray-400 cursor-not-allowed';
      default:
        return 'bg-white hover:bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="w-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center font-semibold text-sm text-gray-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => (
          <button
            key={`${day.date.toISOString()}-${idx}`}
            onClick={(e) => day.isCurrentMonth && onDateClick(day.date, e)}
            disabled={!day.isCurrentMonth || day.priceType === 'disabled'}
            className={`
              aspect-square p-1 rounded border-2 text-sm font-medium
              transition-colors duration-200
              ${getCellColor(day)}
              ${day.isCurrentMonth && day.priceType !== 'disabled' ? 'cursor-pointer' : ''}
              flex flex-col items-center justify-center
            `}
          >
            <div className="text-base">{day.dayOfMonth}</div>
            {day.price && day.isCurrentMonth && (
              <div className="text-xs mt-1">
                <PriceIndicator
                  priceType={day.priceType}
                  price={day.price}
                />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
