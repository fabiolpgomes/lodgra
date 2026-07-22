'use client';

/**
 * RecommendationsView - Display list of price recommendations
 * Story 36.8: Shows all recommendations with filtering and sorting
 */

import React, { useState } from 'react';
import type { PriceRecommendation } from '@/types/pricing.types';
import { PriceRecommendationCard } from './PriceRecommendationCard';
import { AlertCircle, Loader } from 'lucide-react';

interface RecommendationsViewProps {
  recommendations: PriceRecommendation[];
  currentPrice: number;
  onAccept: (recommendationId: string, applyImmediately: boolean) => Promise<void>;
  onReject: (recommendationId: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

type FilterStatus = 'all' | 'pending' | 'accepted' | 'rejected';
type SortOption = 'newest' | 'confidence' | 'impact';

export function RecommendationsView({
  recommendations,
  currentPrice,
  onAccept,
  onReject,
  isLoading = false,
  error,
}: RecommendationsViewProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Filter recommendations
  const filteredRecommendations = recommendations.filter((rec) => {
    if (filterStatus === 'pending') {
      return !rec.accepted && !rec.rejected_at;
    } else if (filterStatus === 'accepted') {
      return rec.accepted;
    } else if (filterStatus === 'rejected') {
      return rec.rejected_at;
    }
    return true;
  });

  // Sort recommendations
  const sortedRecommendations = [...filteredRecommendations].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === 'confidence') {
      return b.confidence - a.confidence;
    } else {
      // Impact (absolute revenue difference)
      const impactA = Math.abs(a.revenue_projection.difference);
      const impactB = Math.abs(b.revenue_projection.difference);
      return impactB - impactA;
    }
  });

  // Show empty state if no recommendations
  if (!isLoading && sortedRecommendations.length === 0 && recommendations.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          No recommendations available
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          We need at least 30 days of price history to generate recommendations. Check back soon!
        </p>
      </div>
    );
  }

  // Show empty filter state
  if (!isLoading && sortedRecommendations.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <p className="text-slate-600 dark:text-slate-400">No recommendations match the selected filter.</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100">Error loading recommendations</h3>
            <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Filter */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Recommendations ({recommendations.length})</option>
              <option value="pending">
                Pending (
                {recommendations.filter((r) => !r.accepted && !r.rejected_at).length})
              </option>
              <option value="accepted">
                Accepted ({recommendations.filter((r) => r.accepted).length})
              </option>
              <option value="rejected">
                Rejected ({recommendations.filter((r) => r.rejected_at).length})
              </option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="confidence">Highest Confidence</option>
              <option value="impact">Highest Impact</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Showing {sortedRecommendations.length} recommendation{sortedRecommendations.length !== 1 ? 's' : ''}
      </p>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
        </div>
      )}

      {/* Recommendations List */}
      {!isLoading && (
        <div className="space-y-4">
          {sortedRecommendations.map((recommendation) => (
            <PriceRecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              currentPrice={currentPrice}
              onAccept={onAccept}
              onReject={onReject}
            />
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <span className="font-semibold">💡 Tip:</span> Recommendations are updated daily based on your
          property's pricing history and market trends. Accept recommendations to automatically update your
          nightly rate.
        </p>
      </div>
    </div>
  );
}
