/**
 * Story 36.3: Calendar Month Component
 * Main calendar container with month navigation and date selection
 */

import React, { useState, useCallback, useMemo } from 'react';
import { CalendarDay, DailyPrice } from '@/types/calendar.types';
import { CalendarGrid } from './CalendarGrid';
import { DateDetailModal } from './DateDetailModal';
import { useCalendarMonth } from './hooks/useCalendarMonth';

interface CalendarMonthProps {
  propertyId: string;
  basePrice?: number;
  weekendPrice?: number;
  onPriceUpdate?: () => void;
}

export function CalendarMonth({
  propertyId,
  basePrice = 0,
  weekendPrice,
  onPriceUpdate,
}: CalendarMonthProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const { prices, loading, error, setPrice, deletePrice, refetchPrices } =
    useCalendarMonth(propertyId, currentMonth);

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    // Previous month's days
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date,
        dayOfWeek: date.getDay(),
        isCurrentMonth: false,
        priceType: 'disabled',
        dayOfMonth: date.getDate(),
      });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toISOString().split('T')[0];
      const dayPrice = prices.get(dateStr);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      let priceType: 'base' | 'weekend' | 'override' | 'disabled' = 'base';
      let price = basePrice;

      if (dayPrice) {
        price = dayPrice.price;
        priceType = 'override';
      } else if (isWeekend && weekendPrice) {
        price = weekendPrice;
        priceType = 'weekend';
      }

      days.push({
        date,
        dayOfWeek: date.getDay(),
        isCurrentMonth: true,
        priceType,
        price,
        dayOfMonth: i,
      });
    }

    // Next month's days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        dayOfWeek: date.getDay(),
        isCurrentMonth: false,
        priceType: 'disabled',
        dayOfMonth: date.getDate(),
      });
    }

    return days;
  }, [currentMonth, prices, basePrice, weekendPrice]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (date: Date) => {
    if (rangeStart && !rangeEnd) {
      // Second click: set range end
      if (date >= rangeStart) {
        setRangeEnd(date);
      }
    } else {
      // First click or reset: set selection
      setSelectedDate(date);
      setRangeStart(null);
      setRangeEnd(null);
      setShowDetailModal(true);
    }
  };

  const handleSavePrice = async (price: number) => {
    if (!selectedDate) return;

    try {
      setModalLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      await setPrice(dateStr, price);
      if (onPriceUpdate) {
        onPriceUpdate();
      }
      setShowDetailModal(false);
    } catch (err) {
      console.error('Error saving price:', err);
      throw err;
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeletePrice = async () => {
    if (!selectedDate) return;

    try {
      setModalLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      await deletePrice(dateStr);
      if (onPriceUpdate) {
        onPriceUpdate();
      }
      setShowDetailModal(false);
    } catch (err) {
      console.error('Error deleting price:', err);
      throw err;
    } finally {
      setModalLoading(false);
    }
  };

  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const selectedDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
  const currentDayPrice = selectedDateStr ? prices.get(selectedDateStr) : undefined;
  const isSelectedWeekend = selectedDate
    ? selectedDate.getDay() === 0 || selectedDate.getDay() === 6
    : false;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{monthName}</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrevMonth}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium"
            >
              ← Prev
            </button>
            <button
              onClick={handleNextMonth}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center text-gray-500 text-sm">
            Loading prices...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error.message}
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      {!loading && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <CalendarGrid
            days={calendarDays}
            onDateClick={handleDateClick}
            selectedDate={selectedDate}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
        </div>
      )}

      {/* Detail Modal */}
      <DateDetailModal
        isOpen={showDetailModal}
        date={selectedDate}
        currentPrice={currentDayPrice?.price}
        basePrice={basePrice}
        weekendPrice={isSelectedWeekend ? weekendPrice : undefined}
        isWeekend={isSelectedWeekend}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedDate(null);
        }}
        onSave={handleSavePrice}
        onDelete={handleDeletePrice}
        loading={modalLoading}
      />
    </div>
  );
}
