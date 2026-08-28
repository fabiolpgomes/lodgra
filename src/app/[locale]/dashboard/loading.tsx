import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { Skeleton } from '@/components/common/ui/skeleton'
import { Sparkles } from 'lucide-react'

function StatSkeleton() {
  return (
    <div className="rounded-[28px] border border-be-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-2xl" />
          <Skeleton className="h-4 w-36 rounded-full" />
        </div>
        <Skeleton className="h-11 w-11 rounded-2xl" />
      </div>
      <div className="mt-6">
        <Skeleton className="h-3 w-full rounded-full" />
      </div>
    </div>
  )
}

function SectionCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-[32px] border border-be-border bg-white p-6 shadow-sm ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-6 w-56 rounded-2xl" />
          </div>
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
        <Skeleton className="h-48 w-full rounded-[24px]" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <AuthLayout hideTopBar>
      <main className="dashboard-readable">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <section className="rounded-[32px] border border-be-border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-10 w-72 rounded-2xl" />
                  <Skeleton className="h-4 w-96 max-w-full rounded-full" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                <Skeleton className="h-10 rounded-full" />
                <Skeleton className="h-10 rounded-full" />
                <Skeleton className="h-10 rounded-full" />
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <SectionCardSkeleton className="min-h-[460px]" />

            <div className="space-y-6">
              <div className="rounded-[32px] border border-be-border bg-white p-6 shadow-sm">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-6 w-44 rounded-2xl" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-28 rounded-2xl" />
                    <Skeleton className="h-28 rounded-2xl" />
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-be-border bg-white p-6 shadow-sm">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-28 rounded-full" />
                  <Skeleton className="h-24 w-full rounded-[24px]" />
                  <Skeleton className="h-24 w-full rounded-[24px]" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AuthLayout>
  )
}
