/**
 * Story 36.7: History Filters Component
 * Provides date range and search filtering for price history
 */

'use client';

import React, { useState } from 'react';
import { HistoryFiltersPayload } from '@/types/pricing.types';

interface HistoryFiltersProps {
  onApplyFilters: (filters: HistoryFiltersPayload) => void;
  loading?: boolean;
}

/**
 * Filters component for date range and search
 */
export function HistoryFilters({
  onApplyFilters,
  loading = false,
}: HistoryFiltersProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    onApplyFilters({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
      page: 1,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setSearch('');
    onApplyFilters({
      page: 1,
    });
  };

  const hasActiveFilters = startDate || endDate || search;

  return (
    <div className="space-y-4">
      {/* Filter toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full md:w-auto px-4 py-2 rounded-lg border transition-colors ${
          hasActiveFilters
            ? 'bg-blue-50 border-blue-300'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <span className="flex items-center gap-2">
          🔍 {isOpen ? 'Hide' : 'Show'} Filters
          {hasActiveFilters && (
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
              {[startDate, endDate, search].filter(Boolean).length} active
            </span>
          )}
        </span>
      </button>

      {/* Filter panel */}
      {isOpen && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          {/* Date range filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Search filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Reason
            </label>
            <input
              type="text"
              placeholder="Search by reason or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
            <button
              onClick={handleReset}
              disabled={loading || !hasActiveFilters}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Applying...' : 'Apply Filters'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
