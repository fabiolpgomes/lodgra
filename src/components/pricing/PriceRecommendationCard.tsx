'use client';

/**
 * PriceRecommendationCard - Display AI price recommendation
 * Story 36.8: Shows recommended price, confidence badge, reasoning, and revenue impact
 * Mobile-responsive with collapsible sections
 */

import React, { useState } from 'react';
import type { PriceRecommendation } from '@/types/pricing.types';
import { RecommendationEngine } from '@/lib/pricing/recommendation-engine';
import { ChevronDown, TrendingUp, Zap } from 'lucide-react';

interface PriceRecommendationCardProps {
  recommendation: PriceRecommendation;
  currentPrice: number;
  onAccept: (recommendationId: string, applyImmediately: boolean) => Promise<void>;
  onReject: (recommendationId: string) => Promise<void>;
  isLoading?: boolean;
}

export function PriceRecommendationCard({
  recommendation,
  currentPrice,
  onAccept,
  onReject,
  isLoading = false,
}: PriceRecommendationCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const confidence = RecommendationEngine.getConfidenceBadge(recommendation.confidence);
  const priceChange = recommendation.recommended_price - currentPrice;
  const priceChangePercent = (priceChange / currentPrice) * 100;
  const revenueChange = recommendation.revenue_projection.difference;

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept(recommendation.id, true);
      setShowModal(false);
    } catch (error) {
      console.error('Error accepting recommendation:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    try {
      await onReject(recommendation.id);
      setShowModal(false);
    } catch (error) {
      console.error('Error rejecting recommendation:', error);
    }
  };

  return (
    <>
      {/* Card Container */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        {/* Header Section */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Recommended Price
              </p>
              <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                  €{recommendation.recommended_price.toFixed(2)}
                </span>
                <span
                  className={`text-lg font-semibold ${
                    priceChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {priceChange >= 0 ? '+' : ''}€{priceChange.toFixed(2)} ({priceChangePercent.toFixed(1)}%)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Current: €{currentPrice.toFixed(2)}
              </p>
            </div>

            {/* Confidence Badge */}
            <div className="flex-shrink-0">
              <div
                className={`px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
                  confidence.level === 'high'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : confidence.level === 'medium'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                }`}
              >
                {confidence.label}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                {(recommendation.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        {/* Reasoning Section */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {recommendation.reason}
          </p>
        </div>

        {/* Revenue Impact Section */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Projected Monthly Impact</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Current</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                €{recommendation.revenue_projection.current_monthly.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Projected</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                €{recommendation.revenue_projection.projected_monthly.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Change</p>
              <p
                className={`text-lg font-semibold mt-1 ${
                  revenueChange >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {revenueChange >= 0 ? '+' : ''}€{Math.abs(revenueChange).toFixed(0)}
              </p>
            </div>
          </div>
          {recommendation.revenue_projection.percentage_change !== 0 && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-3">
              {recommendation.revenue_projection.percentage_change >= 0 ? '+' : ''}
              {recommendation.revenue_projection.percentage_change.toFixed(1)}% monthly revenue change
            </p>
          )}
        </div>

        {/* Market Analysis Section (Collapsible) */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-white">Market Analysis</span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${
                showDetails ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showDetails && (
            <div className="px-4 sm:px-6 pb-4 space-y-3 text-sm bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Market Median:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  €{recommendation.market_analysis.median_price.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Competitor Avg:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  €{recommendation.market_analysis.competitor_avg.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Market Trend:</span>
                <span
                  className={`font-semibold capitalize ${
                    recommendation.market_analysis.market_trend === 'up'
                      ? 'text-green-600 dark:text-green-400'
                      : recommendation.market_analysis.market_trend === 'down'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {recommendation.market_analysis.market_trend}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Sample Size:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {recommendation.market_analysis.sample_size} properties
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!recommendation.accepted && !recommendation.rejected_at && (
          <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-800/50 flex gap-3 flex-col sm:flex-row">
            <button
              onClick={() => setShowModal(true)}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Processing...' : 'Accept & Apply'}
            </button>
            <button
              onClick={handleReject}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reject
            </button>
          </div>
        )}

        {recommendation.accepted && (
          <div className="p-4 sm:p-6 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              ✓ Accepted on {new Date(recommendation.accepted_at!).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-sm w-full">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Accept Recommendation?
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  This will immediately update your property's nightly price to{' '}
                  <span className="font-bold">€{recommendation.recommended_price.toFixed(2)}</span>.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Projected monthly impact:
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {recommendation.revenue_projection.percentage_change >= 0 ? '+' : ''}
                  {recommendation.revenue_projection.percentage_change.toFixed(1)}% revenue
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isAccepting}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAccepting ? 'Accepting...' : 'Yes, Apply Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
