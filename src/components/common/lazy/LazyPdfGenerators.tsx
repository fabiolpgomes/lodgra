'use client'

import dynamic from 'next/dynamic'

const Placeholder = () => <div className="h-64 animate-pulse bg-gray-100 rounded-lg" />

export const LazyReservationsPdfGenerator = dynamic(
  () => import('@/components/features/reports/ReservationsPdfGenerator').then(mod => mod.ReservationsPdfGenerator),
  { ssr: false, loading: Placeholder }
)

export const LazyExpensesPdfGenerator = dynamic(
  () => import('@/components/features/reports/ExpensesPdfGenerator').then(mod => mod.ExpensesPdfGenerator),
  { ssr: false, loading: Placeholder }
)
