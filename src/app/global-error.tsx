'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { errorBoundary: 'global-root' },
      extra: { digest: error.digest },
    })
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '1rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              Algo correu mal
            </h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              Ocorreu um erro inesperado. Tente novamente.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
