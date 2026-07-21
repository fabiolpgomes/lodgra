/**
 * Story 36.5: Bulk Operation Confirmation Modal
 * Displays confirmation dialog for bulk pricing operations
 */

import React, { useMemo } from 'react';
import { BulkOperationConfig } from '@/hooks/useBulkPricingOperation';
import { DailyPrice } from '@/types/calendar.types';

interface BulkOperationModalProps {
  isOpen: boolean;
  config: BulkOperationConfig | null;
  currentPrices: Map<string, DailyPrice>;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function BulkOperationModal({
  isOpen,
  config,
  currentPrices,
  onConfirm,
  onCancel,
  loading = false,
}: BulkOperationModalProps) {
  const affectedDates = useMemo(() => {
    if (!config) return [];

    const dates: string[] = [];
    const current = new Date(config.startDate);

    while (current <= config.endDate) {
      const dateStr = current.toISOString().split('T')[0];
      dates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }, [config]);

  const preview = useMemo(() => {
    if (!config) return [];

    return affectedDates
      .slice(0, 5)
      .map((date) => {
        const current = currentPrices.get(date);
        let newPrice = current?.price;

        if (config.operationType === 'price') {
          newPrice = config.price;
        } else if (config.operationType === 'discount') {
          const basePrice = current?.price || 0;
          newPrice = Math.round(
            basePrice * (1 - (config.discountPercent || 0) / 100)
          );
        } else if (config.operationType === 'copy' && config.sourceDate) {
          const sourceDateStr = config.sourceDate
            .toISOString()
            .split('T')[0];
          newPrice = currentPrices.get(sourceDateStr)?.price;
        } else if (config.operationType === 'delete') {
          newPrice = undefined;
        }

        return {
          date,
          current: current?.price,
          new: newPrice,
        };
      });
  }, [config, affectedDates, currentPrices]);

  const operationLabel = config
    ? {
        price: 'Set Price',
        discount: 'Apply Discount',
        copy: 'Copy Price',
        delete: 'Delete Overrides',
      }[config.operationType]
    : '';

  const shouldWarn = affectedDates.length > 30;

  if (!isOpen || !config) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        {/* Header */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Confirm {operationLabel}
        </h2>

        {/* Warning for large operations */}
        {shouldWarn && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ Large Operation
            </p>
            <p className="text-xs text-amber-700 mt-1">
              This operation will affect {affectedDates.length} dates. Make sure
              this is what you intend.
            </p>
          </div>
        )}

        {/* Operation Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Date Range
            </p>
            <p className="text-sm text-gray-900 font-medium">
              {config.startDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}{' '}
              →{' '}
              {config.endDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Affected Dates
            </p>
            <p className="text-sm text-gray-900 font-medium">
              {affectedDates.length} date{affectedDates.length !== 1 ? 's' : ''}
            </p>
          </div>

          {config.operationType === 'price' && (
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">
                New Price
              </p>
              <p className="text-sm text-gray-900 font-medium">
                ${config.price?.toFixed(2)}
              </p>
            </div>
          )}

          {config.operationType === 'discount' && (
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">
                Discount
              </p>
              <p className="text-sm text-gray-900 font-medium">
                {config.discountPercent}% off
              </p>
            </div>
          )}

          {config.operationType === 'copy' && config.sourceDate && (
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">
                Copy From
              </p>
              <p className="text-sm text-gray-900 font-medium">
                {config.sourceDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>

        {/* Price Preview */}
        {preview.length > 0 && config.operationType !== 'delete' && (
          <div className="mb-4">
            <p className="text-xs text-gray-600 uppercase font-semibold mb-2">
              Price Preview (first 5 dates)
            </p>
            <div className="space-y-1 text-xs">
              {preview.map((item) => (
                <div
                  key={item.date}
                  className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded"
                >
                  <span className="text-gray-600">
                    {new Date(item.date + 'T00:00:00').toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric' }
                    )}
                  </span>
                  <div className="flex gap-2">
                    <span className="text-gray-500">
                      ${item.current?.toFixed(2) || '—'}
                    </span>
                    <span className="text-blue-600 font-medium">
                      ${item.new?.toFixed(2) || '—'}
                    </span>
                  </div>
                </div>
              ))}
              {affectedDates.length > 5 && (
                <div className="text-center py-1 text-gray-500">
                  ... and {affectedDates.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete warning */}
        {config.operationType === 'delete' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800 font-medium">
              ⚠️ This action cannot be undone
            </p>
            <p className="text-xs text-red-700 mt-1">
              All price overrides in this range will be deleted and prices will
              revert to base/weekend rates.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Applying...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
