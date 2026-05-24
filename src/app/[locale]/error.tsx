'use client'

import SentryErrorBoundary from '@/components/common/error/SentryErrorBoundary'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SentryErrorBoundary error={error} reset={reset} />
}
