/**
 * Story 36.9: Reservation Overlay
 * Displays guest names and reservation spans on calendar
 */

import React, { useMemo } from 'react';
import { CalendarDay } from '@/types/calendar.types';

interface Reservation {
  id: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface ReservationOverlayProps {
  days: CalendarDay[];
  reservations: Reservation[];
  getReservationsForDate: (date: Date) => Reservation[];
}

export const ReservationOverlay = React.memo(function ReservationOverlay({
  days,
  reservations,
  getReservationsForDate,
}: ReservationOverlayProps) {
  const daysPerRow = 7;
  const reservationsByStartDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();

    reservations.forEach((res) => {
      const checkIn = new Date(res.checkIn);
      const key = checkIn.toDateString();
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(res);
    });

    return map;
  }, [reservations]);

  const getReservationsStartingOnDay = (day: CalendarDay): Reservation[] => {
    const date = day.date;
    return reservationsByStartDate.get(date.toDateString()) || [];
  };

  const getReservationDurationDays = (res: Reservation): number => {
    const checkIn = new Date(res.checkIn);
    const checkOut = new Date(res.checkOut);
    return Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  return (
    <div className="mt-4 space-y-2">
      {reservations.length > 0 && (
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const startingReservations = getReservationsStartingOnDay(day);

            if (startingReservations.length === 0) {
              return (
                <div
                  key={`overlay-${day.date}`}
                  className="h-6 bg-transparent"
                />
              );
            }

            return (
              <div
                key={`overlay-${day.date}`}
                className="h-6 relative"
              >
                {startingReservations.slice(0, 2).map((res, resIdx) => {
                  const durationDays = getReservationDurationDays(res);
                  const daysFromLeft =
                    (idx % daysPerRow) +
                    (Math.floor(idx / daysPerRow) * daysPerRow);

                  return (
                    <div
                      key={res.id}
                      className={`
                        absolute top-0 text-xs font-semibold px-1 rounded
                        ${
                          res.status === 'confirmed'
                            ? 'bg-blue-400 text-white'
                            : res.status === 'pending'
                              ? 'bg-yellow-300 text-gray-800'
                              : 'bg-gray-300 text-gray-600 line-through'
                        }
                      `}
                      style={{
                        width: `calc(${durationDays * 14.285}% + ${(durationDays - 1) * 4}px)`,
                        top: `${resIdx * 8}px`,
                      }}
                      title={`${res.guestName} (${new Date(res.checkIn).getDate()}-${new Date(res.checkOut).getDate()})`}
                    >
                      <span className="truncate inline-block w-full">
                        {res.guestName.substring(0, 8)}
                        {res.guestName.length > 8 ? '...' : ''}
                      </span>
                    </div>
                  );
                })}

                {startingReservations.length > 2 && (
                  <div className="text-xs text-gray-500 px-1 absolute top-4">
                    +{startingReservations.length - 2}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {reservations.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="font-semibold text-sm mb-2">Legenda:</p>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400 rounded"></div>
              <span>Confirmada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-300 rounded"></div>
              <span>Pendente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <span>Cancelada</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
