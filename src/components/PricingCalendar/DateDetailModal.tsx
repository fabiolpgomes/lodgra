/**
 * Story 36.3: Date Detail Modal
 * Modal for editing price overrides for a specific date
 */

import React, { useState, useEffect } from 'react';
import { DailyPrice } from '@/types/calendar.types';

interface DateDetailModalProps {
  isOpen: boolean;
  date: Date | null;
  currentPrice?: number;
  basePrice?: number;
  weekendPrice?: number;
  isWeekend: boolean;
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
        setError('Price must be a valid positive number');
        return;
      }

      await onSave(price);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save price';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this price override?')) {
      return;
    }

    try {
      setError(null);
      setIsSaving(true);
      await onDelete();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete price';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const effectiveBasePrice = isWeekend && weekendPrice ? weekendPrice : basePrice;

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
                  {isWeekend ? 'Weekend Price' : 'Base Price'}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  €{effectiveBasePrice.toFixed(2)}
                </div>
              </div>
            )}

            {/* Price Override Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Override Price (Optional)
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 mr-2">€</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Leave empty to use base price"
                  disabled={isSaving}
                />
              </div>
              {inputPrice && inputPrice !== (basePrice || '').toString() && (
                <div className="text-sm text-blue-600">
                  Difference: €{(parseFloat(inputPrice) - (effectiveBasePrice || 0)).toFixed(2)}
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
              Cancel
            </button>
            {currentPrice !== undefined && (
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="px-4 py-2 border border-red-300 bg-red-50 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50"
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
