/**
 * Story 36.3 & 36.5: Calendar Month Component
 * Main calendar container with month navigation and bulk operations
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CalendarDay, DailyPrice } from '@/types/calendar.types';
import { CalendarGrid, CalendarReservation } from './CalendarGrid';
import { DateDetailModal } from './DateDetailModal';
import { BulkOperationModal } from './BulkOperationModal';
import { useCalendarMonth } from './hooks/useCalendarMonth';
import { useBulkPricingOperation, BulkOperationConfig } from '@/hooks/useBulkPricingOperation';
import type { CurrencyCode } from '@/lib/utils/currency';

const reservationsCache = new Map<string, CalendarReservation[]>();

export function clearCalendarMonthReservationsCache() {
  reservationsCache.clear();
}

interface CalendarMonthProps {
  propertyId: string;
  basePrice?: number;
  weekendPrice?: number;
  currency?: CurrencyCode;
  onPriceUpdate?: () => void;
}

interface ReservationApiItem {
  id: string;
  guest_name?: string;
  guestName?: string;
  start_date?: string;
  end_date?: string;
  check_in?: string;
  check_out?: string;
  status?: 'confirmed' | 'pending' | 'cancelled' | 'hosting' | 'completed';
}

function parseLocalDate(dateStr: string): Date {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  return new Date(dateStr)
}

export function CalendarMonth({
  propertyId,
  basePrice = 0,
  weekendPrice,
  currency = 'EUR',
  onPriceUpdate,
}: CalendarMonthProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkConfig, setBulkConfig] = useState<BulkOperationConfig | null>(null);
  const [prices, setPrices] = useState<Map<string, DailyPrice>>(new Map());
  const [reservations, setReservations] = useState<CalendarReservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);

  const { prices: fetchedPrices, loading, error, setPrice, deletePrice, refetchPrices } =
    useCalendarMonth(propertyId, currentMonth);

  const {
    applyBulkPrice,
    applyBulkDiscount,
    copyPriceToRange,
    bulkDeleteOverrides,
    undo,
    canUndo,
    canRedo,
    isLoading: bulkLoading,
    getAffectedDates,
  } = useBulkPricingOperation(propertyId, (updatedPrices) => {
    setPrices(updatedPrices);
    if (onPriceUpdate) {
      onPriceUpdate();
    }
  });

  // Sync fetched prices with state
  useEffect(() => {
    setPrices(fetchedPrices);
  }, [fetchedPrices]);

  useEffect(() => {
    let cancelled = false;
    const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    const cacheKey = `${propertyId}:${monthStr}`;
    const cachedReservations = reservationsCache.get(cacheKey);

    if (cachedReservations) {
      setReservations(cachedReservations);
      setLoadingReservations(false);
      return () => {
        cancelled = true;
      };
    }

    const fetchReservations = async () => {
      try {
        setLoadingReservations(true);
        const res = await fetch(`/api/properties/${propertyId}/reservations?month=${monthStr}`);

        if (!res.ok) {
          throw new Error('Failed to fetch reservations');
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data || [];

        const transformed: CalendarReservation[] = list.map((item: ReservationApiItem) => {
          const startStr = item.start_date || item.check_in || '';
          const endStr = item.end_date || item.check_out || '';
          const guestName = item.guest_name || item.guestName || 'Guest';

          return {
            id: item.id,
            guestName,
            checkIn: parseLocalDate(startStr),
            checkOut: parseLocalDate(endStr),
            status: item.status === 'hosting' || item.status === 'completed'
              ? 'confirmed'
              : (item.status || 'pending'),
          };
        });

        if (!cancelled) {
          reservationsCache.set(cacheKey, transformed);
          setReservations(transformed);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching reservations:', err);
          setReservations([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingReservations(false);
        }
      }
    };

    void fetchReservations();

    return () => {
      cancelled = true;
    };
  }, [propertyId, currentMonth]);

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
  }, [currentMonth, prices, basePrice, weekendPrice, rangeStart, rangeEnd]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (date: Date, event?: React.MouseEvent) => {
    // Check for shift key to select range
    if (event && event.shiftKey && rangeStart) {
      // Shift+click to complete range
      const start = rangeStart <= date ? rangeStart : date;
      const end = rangeStart <= date ? date : rangeStart;
      setRangeStart(start);
      setRangeEnd(end);
      setIsSelectingRange(false);
      return;
    }

    if (event && event.ctrlKey) {
      // Ctrl+click to start range selection
      setRangeStart(date);
      setRangeEnd(null);
      setIsSelectingRange(true);
      return;
    }

    if (rangeStart && !rangeEnd) {
      // Second click: set range end
      if (date >= rangeStart) {
        setRangeEnd(date);
        setIsSelectingRange(false);
      }
    } else {
      // First click or reset: set selection
      setSelectedDate(date);
      setRangeStart(null);
      setRangeEnd(null);
      setIsSelectingRange(false);
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

  const handleBulkPrice = () => {
    if (!rangeStart || !rangeEnd) return;

    const config: BulkOperationConfig = {
      operationType: 'price',
      startDate: rangeStart,
      endDate: rangeEnd,
      price: basePrice,
      propertyId,
      currentPrices: prices,
    };

    setBulkConfig(config);
    setShowBulkModal(true);
  };

  const handleBulkDiscount = (discountPercent: number) => {
    if (!rangeStart || !rangeEnd) return;

    const config: BulkOperationConfig = {
      operationType: 'discount',
      startDate: rangeStart,
      endDate: rangeEnd,
      discountPercent,
      propertyId,
      currentPrices: prices,
    };

    setBulkConfig(config);
    setShowBulkModal(true);
  };

  const handleBulkDelete = () => {
    if (!rangeStart || !rangeEnd) return;

    const config: BulkOperationConfig = {
      operationType: 'delete',
      startDate: rangeStart,
      endDate: rangeEnd,
      propertyId,
      currentPrices: prices,
    };

    setBulkConfig(config);
    setShowBulkModal(true);
  };

  const handleConfirmBulkOperation = async () => {
    if (!bulkConfig) return;

    try {
      switch (bulkConfig.operationType) {
        case 'price':
          await applyBulkPrice(bulkConfig);
          break;
        case 'discount':
          await applyBulkDiscount(bulkConfig);
          break;
        case 'delete':
          await bulkDeleteOverrides(bulkConfig);
          break;
      }

      setShowBulkModal(false);
      setBulkConfig(null);
      setRangeStart(null);
      setRangeEnd(null);

      if (onPriceUpdate) {
        onPriceUpdate();
      }
    } catch (err) {
      console.error('Error applying bulk operation:', err);
    }
  };

  const handleUndo = async () => {
    try {
      await undo();
      if (onPriceUpdate) {
        onPriceUpdate();
      }
    } catch (err) {
      console.error('Error undoing operation:', err);
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

  const isLoading = loading || loadingReservations;

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
        {isLoading && (
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

        {/* Range Selection UI */}
        {rangeStart && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                <p className="font-medium">
                  {rangeStart.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {rangeEnd
                    ? ` → ${rangeEnd.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}`
                    : ' (click to end)'}
                </p>
                {rangeEnd && (
                  <p className="text-xs text-gray-500 mt-1">
                    {getAffectedDates(rangeStart, rangeEnd).length} dates selected
                  </p>
                )}
              </div>

              {rangeEnd && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkPrice()}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Set Price
                  </button>
                  <button
                    onClick={() => handleBulkDiscount(10)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    10% Off
                  </button>
                  <button
                    onClick={() => handleBulkDelete()}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setRangeStart(null);
                      setRangeEnd(null);
                      setIsSelectingRange(false);
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Undo/Redo Buttons */}
        {(canUndo || canRedo) && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleUndo}
              disabled={!canUndo || bulkLoading}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              ↶ Undo
            </button>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      {!isLoading && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <CalendarGrid
            days={calendarDays}
            onDateClick={handleDateClick}
            selectedDate={selectedDate}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            isSelectingRange={isSelectingRange}
            reservations={reservations}
            currency={currency}
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
        currency={currency}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedDate(null);
        }}
        onSave={handleSavePrice}
        onDelete={handleDeletePrice}
        loading={modalLoading}
      />

      {/* Bulk Operation Modal */}
      <BulkOperationModal
        isOpen={showBulkModal}
        config={bulkConfig}
        currentPrices={prices}
        onConfirm={handleConfirmBulkOperation}
        onCancel={() => {
          setShowBulkModal(false);
          setBulkConfig(null);
        }}
        loading={bulkLoading}
      />
    </div>
  );
}
