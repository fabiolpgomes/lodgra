'use client'

import type { ValidationResult } from '@/lib/reservations/reservation-validator'

interface ValidationResultsDisplayProps {
  result: ValidationResult
}

export function ValidationResultsDisplay({ result }: ValidationResultsDisplayProps) {
  const statusColor = result.success ? 'text-green-600' : 'text-red-600'
  const statusBg = result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
  const statusIcon = result.success ? '✅' : '❌'

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className={`border-2 rounded-lg p-4 ${statusBg}`}>
        <div className={`flex items-center gap-2 ${statusColor}`}>
          <span className="text-xl">{statusIcon}</span>
          <span className="font-semibold">
            {result.success ? 'Validação OK' : 'Validação com problemas'}
          </span>
        </div>
        {result.errors.length > 0 && (
          <div className="mt-3 space-y-1">
            {result.errors.map((error, i) => (
              <div key={i} className="text-sm text-red-700">
                • {error}
              </div>
            ))}
          </div>
        )}
        {result.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {result.warnings.map((warning, i) => (
              <div key={i} className="text-sm text-yellow-700">
                ⚠️ {warning}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 font-medium">Período</div>
          <div className="text-2xl font-bold mt-2">{result.nights}</div>
          <p className="text-xs text-gray-600 mt-1">noites</p>
          <p className="text-xs text-gray-500 mt-2">
            {new Date(result.checkIn).toLocaleDateString('pt-BR')} →{' '}
            {new Date(result.checkOut).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 font-medium">Preço Base</div>
          <div className="text-2xl font-bold mt-2">
            {result.price.subtotal.toFixed(2)}
            <span className="text-sm ml-1">{result.price.currency}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {result.price.pricePerNight.length > 0
              ? `${result.price.currency}${(result.price.subtotal / result.price.pricePerNight.length).toFixed(2)}/noite`
              : 'N/A'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 font-medium">Preço Final</div>
          <div className="text-2xl font-bold mt-2">
            {result.finalPrice.toFixed(2)}
            <span className="text-sm ml-1">{result.price.currency}</span>
          </div>
          {result.discount.hasDiscount && (
            <p className="text-xs text-green-600 mt-1">
              -{result.discount.discountPercentage}%
            </p>
          )}
        </div>
      </div>

      {/* Discounts */}
      {result.discount.hasDiscount && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="text-sm font-semibold flex items-center gap-2">
            <span>✅</span>
            Desconto Aplicado
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between">
              <span>Tipo:</span>
              <span className="font-medium">
                {result.discount.discountType === 'extended_stay' ? 'Estadia Estendida' : 'Estadia Mínima'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Percentual:</span>
              <span className="font-medium">{result.discount.discountPercentage}%</span>
            </div>
            <div className="flex justify-between">
              <span>Economia:</span>
              <span className="font-medium text-green-600">
                {result.price.currency}{(result.discount.originalPrice - result.discount.discountedPrice).toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-2">{result.discount.reason}</div>
          </div>
        </div>
      )}

      {/* Minimum Nights */}
      <div
        className={`border-2 rounded-lg p-4 ${result.minimumNights.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
      >
        <div className="text-sm font-semibold flex items-center gap-2">
          <span>{result.minimumNights.passed ? '✅' : '❌'}</span>
          Noites Mínimas - {result.minimumNights.passed ? 'OK' : 'Erro'}
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between">
            <span>Requerido:</span>
            <span className="font-medium">{result.minimumNights.minimumNights} noites</span>
          </div>
          <div className="flex justify-between">
            <span>Selecionado:</span>
            <span className="font-medium">{result.minimumNights.selectedNights} noites</span>
          </div>
          {!result.minimumNights.passed && result.minimumNights.error && (
            <div className="text-sm text-red-700 mt-2">{result.minimumNights.error}</div>
          )}
        </div>
      </div>

      {/* Cancellation Policy */}
      {result.cancellationPolicy.success && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="font-semibold text-gray-900">Política de Cancelamento</div>
          <div className="text-sm text-gray-600">{result.cancellationPolicy.policyName}</div>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600">Reembolso:</p>
                <p className="font-medium">{result.cancellationPolicy.refundPercentage}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Prazo:</p>
                <p className="font-medium">{result.cancellationPolicy.refundDeadlineDays} dias</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-800">{result.cancellationPolicy.terms}</p>
            </div>
          </div>
        </div>
      )}

      {result.cancellationPolicy.error && !result.cancellationPolicy.success && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-medium text-yellow-800">Aviso</p>
              <p className="text-sm text-yellow-700">{result.cancellationPolicy.error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
