'use client';

import React, { useEffect } from 'react';
import { ForecastingAPIResponse, RevenueForecast } from '@/types/forecasting';
import { X } from 'lucide-react';

interface ForecastDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  forecast: RevenueForecast | null;
  data: ForecastingAPIResponse | null;
  period: '30' | '60' | '90';
}

export function ForecastDetailsModal({
  isOpen,
  onClose,
  forecast,
  data,
  period,
}: ForecastDetailsModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !forecast || !data) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-labelledby="modal-title"
          aria-modal="true"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
            <div>
              <h2 id="modal-title" className="text-2xl font-bold text-slate-900 dark:text-white">
                {period}-Day Forecast Details
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {forecast.createdAt
                  ? new Date(forecast.createdAt).toLocaleDateString()
                  : 'No date'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Forecast Summary */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Forecast Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Projected Revenue
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    €{forecast.projectedRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                    Confidence Score
                  </p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                    {(forecast.confidenceScore * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </section>

            {/* Assumptions */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Key Assumptions
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">Seasonal Factor</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">
                    {data.assumptions.seasonalPattern ? 'Applied' : 'None'}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                  <dt className="text-slate-600 dark:text-slate-400">Base Occupancy Rate</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">
                    {(data.assumptions.avgOccupancyRate * 100).toFixed(1)}%
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                  <dt className="text-slate-600 dark:text-slate-400">Base Price Estimate</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">
                    €{forecast.basePriceEstimate ? forecast.basePriceEstimate.toFixed(2) : 'N/A'}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                  <dt className="text-slate-600 dark:text-slate-400">Data Points Used</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">
                    {forecast.dataPointsCount} bookings
                  </dd>
                </div>
              </dl>
            </section>

            {/* Holiday Events */}
            {data.assumptions.holidayEvents && data.assumptions.holidayEvents.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Holiday Events
                </h3>
                <ul className="space-y-2">
                  {data.assumptions.holidayEvents.map((event, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <span className="text-slate-900 dark:text-white">{event.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {event.date}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            event.expectedImpact > 0
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                          }`}
                        >
                          {event.expectedImpact > 0 ? '+' : ''}
                          {(event.expectedImpact * 100).toFixed(0)}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Recommendations */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Recommendations
              </h3>
              <ul className="space-y-2">
                {data.summary.recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <span className="text-blue-600 dark:text-blue-400 font-bold flex-shrink-0">
                      •
                    </span>
                    <span className="text-slate-900 dark:text-white">{rec}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Methodology */}
            <section className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Forecast Methodology
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                This forecast is based on {data.assumptions.last90DaysBookings} recent bookings
                combined with seasonal adjustments, day-of-week patterns, and historical
                occupancy rates. The confidence interval represents ±15% variance from the
                central forecast.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
