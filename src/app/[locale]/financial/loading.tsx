import { AuthLayout } from '@/components/layout/AuthLayout'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <AuthLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Chart placeholder */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 flex gap-8">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-6 py-4 border-t border-gray-100 flex gap-8 items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}
