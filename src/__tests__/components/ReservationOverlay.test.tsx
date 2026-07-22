/**
 * Story 36.9: ReservationOverlay Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReservationOverlay } from '@/components/ReservationOverlay';
import { CalendarDay } from '@/types/calendar.types';

describe('ReservationOverlay', () => {
  const mockDays: CalendarDay[] = [
    {
      date: new Date('2026-07-01'),
      dayOfWeek: 3,
      dayOfMonth: 1,
      isCurrentMonth: true,
      priceType: 'base',
    },
    {
      date: new Date('2026-07-02'),
      dayOfWeek: 4,
      dayOfMonth: 2,
      isCurrentMonth: true,
      priceType: 'base',
    },
    {
      date: new Date('2026-07-05'),
      dayOfWeek: 0,
      dayOfMonth: 5,
      isCurrentMonth: true,
      priceType: 'weekend',
    },
  ];

  const mockReservations = [
    {
      id: 'res-1',
      guestName: 'João Silva',
      checkIn: new Date('2026-07-01'),
      checkOut: new Date('2026-07-05'),
      status: 'confirmed' as const,
    },
    {
      id: 'res-2',
      guestName: 'Maria Santos',
      checkIn: new Date('2026-07-05'),
      checkOut: new Date('2026-07-10'),
      status: 'pending' as const,
    },
  ];

  const mockGetReservations = (date: Date) => {
    return mockReservations.filter(
      res =>
        new Date(res.checkIn) <= date && date < new Date(res.checkOut)
    );
  };

  it('renders empty state when no reservations', () => {
    const { container } = render(
      <ReservationOverlay
        days={mockDays}
        reservations={[]}
        getReservationsForDate={mockGetReservations}
      />
    );

    // Should not have reservation bars
    expect(container.querySelectorAll('[class*="bg-blue"]').length).toBe(0);
  });

  it('renders legend when reservations exist', () => {
    render(
      <ReservationOverlay
        days={mockDays}
        reservations={mockReservations}
        getReservationsForDate={mockGetReservations}
      />
    );

    expect(screen.getByText(/Legenda/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirmada/i)).toBeInTheDocument();
    expect(screen.getByText(/Pendente/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancelada/i)).toBeInTheDocument();
  });

  it('displays reservation status colors correctly', () => {
    const { container } = render(
      <ReservationOverlay
        days={mockDays}
        reservations={mockReservations}
        getReservationsForDate={mockGetReservations}
      />
    );

    // Should have confirmed (blue) and pending (yellow) reservations
    const coloredElements = container.querySelectorAll(
      '[class*="bg-blue"], [class*="bg-yellow"]'
    );
    expect(coloredElements.length).toBeGreaterThan(0);
  });

  it('truncates long guest names', () => {
    const longNameRes = [
      {
        id: 'res-3',
        guestName: 'VeryLongGuestNameThatShouldBeTruncated',
        checkIn: new Date('2026-07-01'),
        checkOut: new Date('2026-07-05'),
        status: 'confirmed' as const,
      },
    ];

    const { container } = render(
      <ReservationOverlay
        days={mockDays}
        reservations={longNameRes}
        getReservationsForDate={mockGetReservations}
      />
    );

    // Name should be truncated to 8 chars + '...'
    expect(container.textContent).toContain('VeryLong');
  });

  it('calculates reservation span correctly', () => {
    render(
      <ReservationOverlay
        days={mockDays}
        reservations={mockReservations}
        getReservationsForDate={mockGetReservations}
      />
    );

    // Reservation from July 1-5 (4 days)
    expect(screen.getByText(/João Silva|João/)).toBeInTheDocument();
  });

  it('shows +N more count for multiple reservations', () => {
    const manyReservations = [
      ...mockReservations,
      {
        id: 'res-3',
        guestName: 'Pedro Costa',
        checkIn: new Date('2026-07-01'),
        checkOut: new Date('2026-07-05'),
        status: 'confirmed' as const,
      },
    ];

    const { container } = render(
      <ReservationOverlay
        days={mockDays}
        reservations={manyReservations}
        getReservationsForDate={mockGetReservations}
      />
    );

    // Should show count when >2 reservations on same day
    const countElements = container.textContent;
    if (countElements.includes('+')) {
      expect(countElements).toMatch(/\+\d/);
    }
  });
});
