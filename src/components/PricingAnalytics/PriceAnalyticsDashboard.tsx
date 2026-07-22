/**
 * Story 36.7: Price Analytics Dashboard Component
 * Main dashboard combining timeline, statistics, and filters
 */

'use client';

import React, { useState } from 'react';
import { usePriceHistory, usePriceHistoryStats } from '@/hooks/usePriceHistory';
import { useAnalyticsCalculator } from '@/hooks/useAnalyticsCalculator';
import { PriceHistoryTimeline } from './PriceHistoryTimeline';
import { PriceStatisticsComponent } from './PriceStatistics';
import { HistoryFilters } from './HistoryFilters';
import { RevertModal } from './RevertModal';
import { PriceHistory } from '@/types/pricing.types';
import { exportCsvFile } from '@/lib/pricing/csv-exporter';

interface PriceAnalyticsDashboardProps {
  propertyId: string;
  title?: string;
}

/**
 * Complete price analytics dashboard
 */
export function PriceAnalyticsDashboard({
  propertyId,
  title = 'Price Analytics & History',
}: PriceAnalyticsDashboardProps) {
  const [revertingRecordId, setRevertingRecordId] = useState<string | null>(null);
  const [revertLoading, setRevertLoading] = useState(false);

  // Fetch data
  const history = usePriceHistory({ propertyId, limit: 50 });
  const stats = usePriceHistoryStats(propertyId, 30);

  // Calculate analytics
  const analytics = useAnalyticsCalculator(history.data);

  const currentPrice = history.data.length > 0 ? history.data[0].price : 0;
  const revertingRecord = revertingRecordId
    ? history.data.find((r) => r.id === revertingRecordId)
    : null;

  // Handle export
  const handleExport = async () => {
    try {
      const res = await globalThis.fetch(
        `/api/properties/${propertyId}/price-history/export`
      );

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const csv = await res.text();
      exportCsvFile(history.data, propertyId, true);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export price history');
    }
  };

  // Handle revert
  const handleRevert = async (recordId: string, reason?: string) => {
    setRevertLoading(true);
    try {
      const res = await globalThis.fetch(
        `/api/properties/${propertyId}/price-history/revert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordId, reason }),
        }
      );

      if (!res.ok) {
        throw new Error('Revert failed');
      }

      // Refresh history
      await history.fetch();
      setRevertingRecordId(null);
      alert('Price reverted successfully');
    } catch (error) {
      console.error('Revert error:', error);
      alert('Failed to revert price');
    } finally {
      setRevertLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">
            Track and analyze price changes over time
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleExport}
            disabled={history.loading || history.data.length === 0}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Statistics cards */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Key Metrics</h2>
        <PriceStatisticsComponent
          stats={stats.data}
          loading={stats.loading}
        />
      </div>

      {/* Analytics summary */}
      {!stats.loading && stats.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Trend</p>
            <p className="text-2xl font-bold mt-2 capitalize">
              {analytics.trend === 'up' && '📈 Up'}
              {analytics.trend === 'down' && '📉 Down'}
              {analytics.trend === 'stable' && '➡️ Stable'}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Change Frequency</p>
            <p className="text-2xl font-bold mt-2">
              {analytics.frequency.toFixed(1)} per week
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Significant Changes</p>
            <p className="text-2xl font-bold mt-2">
              {analytics.significantChanges.length}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Filter History</h2>
        <HistoryFilters
          onApplyFilters={history.applyFilters}
          loading={history.loading}
        />
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Price Timeline</h2>
        <PriceHistoryTimeline
          history={history.data}
          loading={history.loading}
          hasMore={history.hasMore}
          onLoadMore={history.loadMore}
        />
      </div>

      {/* Revert modal */}
      <RevertModal
        isOpen={!!revertingRecordId}
        record={revertingRecord || null}
        currentPrice={currentPrice}
        onConfirm={handleRevert}
        onCancel={() => setRevertingRecordId(null)}
        loading={revertLoading}
      />

      {/* Action buttons for timeline items */}
      <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p>
          💡 <strong>Tip:</strong> Click on any price change to expand details. Use the
          filters above to search by date range or reason.
        </p>
      </div>
    </div>
  );
}
