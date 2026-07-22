/**
 * Story 36.7: Price History Timeline Component
 * Displays price changes in chronological order
 */

'use client';

import React, { useState } from 'react';
import { PriceHistory } from '@/types/pricing.types';
import { formatPrice, formatDate } from '@/lib/pricing/price-history-calculator';

interface PriceHistoryTimelineProps {
  history: PriceHistory[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

/**
 * Timeline component for price history visualization
 */
export function PriceHistoryTimeline({
  history,
  loading = false,
  onLoadMore,
  hasMore = false,
}: PriceHistoryTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading && history.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No price history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Timeline items */}
        <div className="space-y-4">
          {history.map((record, index) => {
            const previousRecord = index < history.length - 1 ? history[index + 1] : null;
            const priceChange = previousRecord
              ? record.price - previousRecord.price
              : 0;
            const percentageChange =
              previousRecord && previousRecord.price > 0
                ? ((priceChange / previousRecord.price) * 100).toFixed(2)
                : '0.00';

            const isExpanded = expandedId === record.id;

            return (
              <div key={record.id} className="relative pl-12">
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white ${
                    record.is_revert
                      ? 'bg-orange-500'
                      : priceChange > 0
                        ? 'bg-red-500'
                        : priceChange < 0
                          ? 'bg-green-500'
                          : 'bg-gray-400'
                  }`}
                >
                  <span className="text-white text-sm font-bold">
                    {record.is_revert ? '↶' : priceChange > 0 ? '↑' : priceChange < 0 ? '↓' : '='}
                  </span>
                </div>

                {/* Card content */}
                <div
                  className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-semibold">
                          {formatPrice(record.price)}
                        </span>
                        {previousRecord && (
                          <span
                            className={`text-sm font-medium ${
                              priceChange > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {priceChange > 0 ? '+' : ''}{formatPrice(priceChange)} ({percentageChange}%)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(record.date_applied)}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        record.is_revert
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {record.is_revert ? 'Reverted' : 'Active'}
                    </span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                      {record.change_reason && (
                        <div>
                          <p className="text-sm text-gray-600">Reason:</p>
                          <p className="text-sm font-medium">{record.change_reason}</p>
                        </div>
                      )}
                      {previousRecord && (
                        <div>
                          <p className="text-sm text-gray-600">Previous Price:</p>
                          <p className="text-sm font-medium">
                            {formatPrice(previousRecord.price)}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Changed:</p>
                        <p className="text-sm font-medium">
                          {new Date(record.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
