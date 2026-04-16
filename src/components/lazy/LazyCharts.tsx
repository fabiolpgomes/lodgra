'use client'

import dynamic from 'next/dynamic'

const Placeholder = () => <div className="h-64 animate-pulse bg-gray-100 rounded-lg" />

export const LazyOccupancyChart = dynamic(
  () => import('@/components/dashboard/OccupancyChart').then(mod => mod.OccupancyChart),
  { ssr: false, loading: Placeholder }
)

export const LazyRevenueChart = dynamic(
  () => import('@/components/dashboard/RevenueChart').then(mod => mod.RevenueChart),
  { ssr: false, loading: Placeholder }
)

export const LazyStatusChart = dynamic(
  () => import('@/components/dashboard/StatusChart').then(mod => mod.StatusChart),
  { ssr: false, loading: Placeholder }
)

export const LazyCommissionDashboard = dynamic(
  () => import('@/components/commission/CommissionDashboard').then(mod => mod.CommissionDashboard),
  { ssr: false, loading: () => <div className="h-96 animate-pulse bg-gray-100 rounded-lg" /> }
)
