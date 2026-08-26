'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import { useLocale } from 'next-intl'
import { Button } from '@/components/common/ui/button'

export default function ExpenseDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const locale = useLocale()

  useEffect(() => {
    console.error('Expense detail error:', error)
  }, [error])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-white rounded-2xl shadow p-8">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Não foi possível abrir esta despesa</h1>
        <p className="text-gray-600 mb-6">
          O detalhe desta despesa encontrou um erro inesperado. Pode tentar novamente ou voltar para a lista.
        </p>

        {error?.message && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 mb-6 text-left break-words">
            {error.message}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset}>
            <RefreshCw className="h-5 w-5" />
            Tentar Novamente
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/${locale}/expenses`}>
              <ArrowLeft className="h-5 w-5" />
              Voltar às Despesas
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
