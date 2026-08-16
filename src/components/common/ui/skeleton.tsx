import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200',
        className
      )}
      {...props}
    />
  )
}

export function CalendarDaySkeleton() {
  return (
    <div className="day-cell">
      <Skeleton className="h-4 w-4 mx-auto" />
    </div>
  )
}

export function CalendarGridSkeleton() {
  return (
    <div className="calendar-grid-mobile">
      {/* Day headers */}
      {[...Array(7)].map((_, i) => (
        <Skeleton key={`header-${i}`} className="h-8 w-full" />
      ))}
      {/* Day cells */}
      {[...Array(35)].map((_, i) => (
        <CalendarDaySkeleton key={`day-${i}`} />
      ))}
    </div>
  )
}

export function PropertyCardSkeleton() {
  return (
    <div className="property-card">
      <Skeleton className="property-image h-[120px] w-full rounded-lg" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

export function PropertyListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mobile-property-list">
      {[...Array(count)].map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function SettingsCardSkeleton() {
  return (
    <div className="price-card">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-6 w-12 rounded-full" />
    </div>
  )
}

export function SettingsSidebarSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[...Array(5)].map((_, i) => (
        <SettingsCardSkeleton key={i} />
      ))}
    </div>
  )
}
