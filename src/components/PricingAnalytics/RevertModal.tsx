/**
 * Story 36.7: Revert Modal Component
 * Confirms and executes price revert operations
 */

'use client';

import React, { useState } from 'react';
import { PriceHistory } from '@/types/pricing.types';
import { formatPrice, formatDate } from '@/lib/pricing/price-history-calculator';
import type { CurrencyCode } from '@/lib/utils/currency';

interface RevertModalProps {
  isOpen: boolean;
  record: PriceHistory | null;
  currentPrice: number;
  onConfirm: (recordId: string, reason?: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  currency?: CurrencyCode;
}

/**
 * Modal for confirming price revert operations
 */
export function RevertModal({
  isOpen,
  record,
  currentPrice,
  onConfirm,
  onCancel,
  loading = false,
  currency,
}: RevertModalProps) {
  const resolvedCurrency = currency?.toUpperCase() as CurrencyCode | undefined;
  const formatRevertPrice = (value: number): string => {
    return resolvedCurrency ? formatPrice(value, resolvedCurrency) : value.toFixed(2);
  };
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !record) {
    return null;
  }

  const priceChange = currentPrice - record.price;
  const percentageChange =
    currentPrice > 0 ? ((priceChange / currentPrice) * 100).toFixed(2) : '0.00';

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(record.id, reason || undefined);
      setReason('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReason('');
    onCancel();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full space-y-6">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">Reverter preço</h2>
            <p className="text-sm text-gray-600 mt-1">
              Volte o preço atual para um valor anterior
            </p>
          </div>

          {/* Content */}
          <div className="px-6 space-y-4">
            {/* Current price info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">Preço atual</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">
                {formatRevertPrice(currentPrice)}
              </p>
            </div>

            {/* Revert to price info */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm font-medium text-emerald-900">Reverter para</p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">
                {formatRevertPrice(record.price)}
              </p>
              <p className="text-xs text-emerald-700 mt-2">
                De {formatDate(record.date_applied)}
              </p>
            </div>

            {/* Price change summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700">Alteração de preço</p>
              <p
                className={`text-lg font-bold mt-1 ${
                  priceChange > 0 ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {priceChange > 0 ? '+' : ''}{formatRevertPrice(Math.abs(priceChange))} ({priceChange > 0 ? '+' : ''}{percentageChange}%)
              </p>
            </div>

            {/* Reason field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo da reversão (opcional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: correção de um erro na tarifa sazonal"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Warning message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Isto cria um novo registo de histórico de preços. Os registos antigos não são apagados.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              disabled={submitting || loading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting || loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting || loading ? 'A reverter...' : 'Confirmar reversão'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
