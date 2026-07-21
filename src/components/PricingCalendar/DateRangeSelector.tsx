/**
 * Story 36.5: Date Range Selector Component
 * Handles selection of date ranges with visual highlighting
 */

import React, { useState, useCallback } from 'react';

interface DateRangeSelectorProps {
  onRangeSelect: (startDate: Date, endDate: Date) => void;
  onCancel?: () => void;
  highlightedDates?: Date[];
  minDate?: Date;
  maxDate?: Date;
}

export function DateRangeSelector({
  onRangeSelect,
  onCancel,
  highlightedDates = [],
  minDate,
  maxDate,
}: DateRangeSelectorProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const handleDateClick = useCallback(
    (date: Date) => {
      if (!startDate) {
        setStartDate(date);
      } else {
        const start = startDate <= date ? startDate : date;
        const end = startDate <= date ? date : startDate;
        onRangeSelect(start, end);
        setStartDate(null);
      }
    },
    [startDate, onRangeSelect]
  );

  const handleCancel = useCallback(() => {
    setStartDate(null);
    setHoveredDate(null);
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  const isDateHighlighted = (date: Date): boolean => {
    return highlightedDates.some(
      (d) => d.toDateString() === date.toDateString()
    );
  };

  const isInRange = (date: Date): boolean => {
    if (!startDate) return false;
    const end = hoveredDate || startDate;
    const rangeStart = startDate <= end ? startDate : end;
    const rangeEnd = startDate <= end ? end : startDate;
    return date >= rangeStart && date <= rangeEnd;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'None';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          <span className="block">Start: {formatDate(startDate)}</span>
          {startDate && hoveredDate && (
            <span className="block text-xs text-gray-500 mt-1">
              {Math.ceil(
                (hoveredDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
              ) + 1} days selected
            </span>
          )}
        </div>
        <button
          onClick={handleCancel}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      <div className="text-xs text-gray-600">
        {!startDate
          ? 'Click a date to start selection'
          : 'Click another date to end selection'}
      </div>
    </div>
  );
}
