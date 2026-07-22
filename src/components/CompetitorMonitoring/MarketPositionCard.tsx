'use client';

import React from 'react';
import { MarketPositionAnalysis } from '@/types/competitor';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface MarketPositionCardProps {
  analysis: MarketPositionAnalysis;
}

export function MarketPositionCard({ analysis }: MarketPositionCardProps) {
  const percentDiff = Math.abs(analysis.percentageDifference);
  const isHigher = analysis.percentageDifference > 0;

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'very_low':
        return { bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-700 dark:text-green-300', badge: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' };
      case 'low':
        return { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200' };
      case 'competitive':
        return { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' };
      case 'high':
        return { bg: 'bg-yellow-50 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-300', badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' };
      case 'very_high':
        return { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-300', badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' };
      default:
        return { bg: 'bg-slate-50 dark:bg-slate-950', text: 'text-slate-700 dark:text-slate-300', badge: 'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-200' };
    }
  };

  const colors = getPositionColor(analysis.pricePosition);

  return (
    <div className={`${colors.bg} border-2 border-slate-200 dark:border-slate-700 rounded-lg p-6 md:p-8`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Position Overview */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Market Position
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Your Current Price</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                €{analysis.hostPrice.toFixed(2)}/night
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Market Average</p>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                €{analysis.marketAveragePrice.toFixed(2)}/night
              </p>
            </div>

            <div className="border-t border-slate-300 dark:border-slate-600 pt-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Position</p>
              <div className="flex items-center gap-3">
                {isHigher ? (
                  <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
                <span className={`font-semibold ${colors.text}`}>
                  {percentDiff.toFixed(1)}% {isHigher ? 'higher' : 'lower'} than market
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Market Details */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Market Overview
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Market Range</p>
              <p className="text-sm text-slate-900 dark:text-white font-medium">
                €{analysis.marketRange.min.toFixed(2)} - €{analysis.marketRange.max.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${colors.badge}`}>
                {analysis.pricePosition.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="border-t border-slate-300 dark:border-slate-600 pt-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Recommendation</p>
              <div className="flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 mt-0.5 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                <p className="text-sm text-slate-700 dark:text-slate-300">{analysis.recommendation}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
