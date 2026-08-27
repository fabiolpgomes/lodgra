/**
 * Story 36.3: Date Detail Modal
 * Modal for editing price overrides for a specific date
 */

import React, { useState, useEffect } from 'react';
import { DailyPrice } from '@/types/calendar.types';
import { formatCurrency, getCurrencySymbol, type CurrencyCode } from '@/lib/utils/currency';

interface DateDetailModalProps {
  isOpen: boolean;
  date: Date | null;
  currentPrice?: number;
  basePrice?: number;
  weekendPrice?: number;
  isWeekend: boolean;
  currency?: CurrencyCode;
  onClose: () => void;
  onSave: (price: number) => Promise<void>;
  onDelete: () => Promise<void>;
  loading?: boolean;
}

export function DateDetailModal({
  isOpen,
  date,
  currentPrice,
  basePrice,
  weekendPrice,
  isWeekend,
  currency,
  onClose,
  onSave,
  onDelete,
  loading = false,
}: DateDetailModalProps) {
  const [inputPrice, setInputPrice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && date) {
      setInputPrice((currentPrice || basePrice || '').toString());
      setError(null);
    }
  }, [isOpen, date, currentPrice, basePrice]);

  if (!isOpen || !date) {
    return null;
  }

  const handleSave = async () => {
    try {
      setError(null);
      setIsSaving(true);

      const price = parseFloat(inputPrice);
      if (isNaN(price) || price < 0) {
        setError('O preço deve ser um número positivo válido');
        return;
      }

      await onSave(price);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao guardar o preço';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem a certeza de que quer eliminar esta alteração de preço?')) {
      return;
    }

    try {
      setError(null);
      setIsSaving(true);
      await onDelete();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao eliminar o preço';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const dateStr = date.toLocaleDateString('pt-PT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const effectiveBasePrice = isWeekend && weekendPrice ? weekendPrice : basePrice;
  const currencySymbol = currency ? getCurrencySymbol(currency) : '';
  const formatPriceValue = (value: number | undefined): string => {
    if (value === undefined) return '—';
    return currency ? formatCurrency(value, currency) : value.toFixed(2);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">{dateStr}</h2>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-4">
            {/* Base Price Display */}
            {effectiveBasePrice && (
              <div className="bg-gray-50 rounded p-3">
                <div className="text-sm text-gray-600">
                  {isWeekend ? 'Preço de fim de semana' : 'Preço base'}
                </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPriceValue(effectiveBasePrice)}
              </div>
            </div>
          )}

            {/* Price Override Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Preço de exceção (opcional)
              </label>
              <div className="flex items-center">
                {currencySymbol && <span className="text-gray-500 mr-2">{currencySymbol}</span>}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Deixe vazio para usar o preço base"
                  disabled={isSaving}
                />
              </div>
              {inputPrice && inputPrice !== (basePrice || '').toString() && (
                <div className="text-sm text-blue-600">
                  Diferença: {formatPriceValue(parseFloat(inputPrice) - (effectiveBasePrice || 0))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            {currentPrice !== undefined && (
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="px-4 py-2 border border-red-300 bg-red-50 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50"
              >
                Eliminar
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
