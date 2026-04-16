import { AuthLayout } from '@/components/layout/AuthLayout'

export default function Loading() {
  return (
    <AuthLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded w-52"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-80"></div>
          </div>

          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-5 bg-gray-200 rounded w-40"></div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-64 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </AuthLayout>
  )
}
