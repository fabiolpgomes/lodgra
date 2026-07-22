/**
 * Story 36.9: Detailed Calendar (Mobile + Web)
 * Main calendar view with prices and reservations
 */

import React, { useState, useEffect } from 'react';
import { CalendarGrid } from './PricingCalendar/CalendarGrid';
import { CalendarHeader } from './CalendarHeader';
import { ReservationOverlay } from './ReservationOverlay';
import { useCalendarMonth } from './PricingCalendar/hooks/useCalendarMonth';
import { CalendarDay, DailyPrice } from '@/types/calendar.types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Reservation {
  id: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface DetailedCalendarProps {
  propertyId: string;
  isMobile?: boolean;
  onSettingsClick?: () => void;
  onMonthPickerClick?: () => void;
}

export function DetailedCalendar({
  propertyId,
  isMobile = false,
  onSettingsClick,
  onMonthPickerClick,
}: DetailedCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);

  // Fetch reservations
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoadingReservations(true);
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        const res = await fetch(
          `/api/properties/${propertyId}/reservations?month=${monthStr}`
        );
        if (res.ok) {
          const data = await res.json();
          setReservations(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch reservations:', err);
      } finally {
        setLoadingReservations(false);
      }
    };

    fetchReservations();
  }, [propertyId, currentMonth]);

  // Fetch daily prices using hook
  const calendarMonth = useCalendarMonth(propertyId, currentMonth);

  // Generate calendar days for current month
  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    const current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      const isWeekend = current.getDay() === 0 || current.getDay() === 6;
      days.push({
        date: new Date(current),
        dayOfWeek: current.getDay(),
        dayOfMonth: current.getDate(),
        isCurrentMonth: current.getMonth() === month,
        priceType: isWeekend ? 'weekend' : 'base',
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const getReservationsForDate = (date: Date): Reservation[] => {
    return reservations.filter((res: Reservation) => {
      const checkIn = new Date(res.checkIn);
      const checkOut = new Date(res.checkOut);
      return date >= checkIn && date < checkOut;
    });
  };

  const getPriceForDate = (date: Date | string): string => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const price = calendarMonth.prices.get(dateStr);
    return price?.price ? `€${price.price}` : '—';
  };

  const isLoading = calendarMonth.loading || loadingReservations;

  if (isLoading) {
    return <div className="p-4 text-center">Carregando calendário...</div>;
  }

  return (
    <div
      className={`w-full ${isMobile ? 'flex flex-col h-screen' : 'max-w-4xl mx-auto'}`}
    >
      {/* Header */}
      <CalendarHeader
        propertyName="Sua Propriedade"
        onSettingsClick={onSettingsClick}
        onMonthPickerClick={onMonthPickerClick}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <div className={`flex-1 ${isMobile ? 'overflow-auto' : 'p-6'}`}>
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6 px-4">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-semibold">
            {currentMonth.toLocaleDateString('pt-PT', {
              month: 'long',
              year: 'numeric',
            })}
          </h2>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid with Overlay */}
        <div className="px-4 pb-4">
          <CalendarGrid
            days={calendarDays}
            onDateClick={handleDateClick}
            selectedDate={selectedDate}
          />

          {/* Reservations Overlay */}
          <ReservationOverlay
            days={calendarDays}
            reservations={reservations}
            getReservationsForDate={getReservationsForDate}
          />
        </div>

        {/* Day Details */}
        {selectedDate && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="font-semibold">
              {selectedDate.toLocaleDateString('pt-PT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p className="mt-2">
              Preço: <span className="font-bold">{getPriceForDate(selectedDate)}</span>
            </p>
            {getReservationsForDate(selectedDate).length > 0 && (
              <div className="mt-3">
                <p className="font-semibold">Reservas:</p>
                <ul className="mt-2 space-y-1">
                  {getReservationsForDate(selectedDate).map((res) => (
                    <li key={res.id} className="text-sm">
                      {res.guestName}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
