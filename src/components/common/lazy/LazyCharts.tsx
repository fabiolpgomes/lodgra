'use client'

import dynamic from 'next/dynamic'

const Placeholder = () => <div className="h-64 animate-pulse bg-gray-100 rounded-lg" />

export const LazyOccupancyChart = dynamic(
  () => import('@/components/features/dashboard/OccupancyChart').then(mod => mod.OccupancyChart),
  { ssr: false, loading: Placeholder }
)

export const LazyRevenueChart = dynamic(
  () => import('@/components/features/dashboard/RevenueChart').then(mod => mod.RevenueChart),
  { ssr: false, loading: Placeholder }
)

export const LazyStatusChart = dynamic(
  () => import('@/components/features/dashboard/StatusChart').then(mod => mod.StatusChart),
  { ssr: false, loading: Placeholder }
)

export const LazyCommissionDashboard = dynamic(
  () => import('@/components/features/commission/CommissionDashboard').then(mod => mod.CommissionDashboard),
  { ssr: false, loading: () => <div className="h-96 animate-pulse bg-gray-100 rounded-lg" /> }
)
