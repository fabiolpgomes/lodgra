import { AuthLayout } from '@/components/layout/AuthLayout'

export default function Loading() {
  return (
    <AuthLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-40 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="h-6 bg-gray-200 rounded w-32"></div>
              <div className="flex gap-2">
                <div className="h-9 bg-gray-200 rounded w-9"></div>
                <div className="h-9 bg-gray-200 rounded w-9"></div>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[...Array(7)].map((_, i) => (
                <div key={`h-${i}`} className="h-6 bg-gray-200 rounded mb-2"></div>
              ))}
              {[...Array(35)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </AuthLayout>
  )
}
