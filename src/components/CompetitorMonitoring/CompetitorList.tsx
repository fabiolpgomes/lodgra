'use client';

import React from 'react';
import { Competitor } from '@/types/competitor';
import { ExternalLink, Trash2 } from 'lucide-react';

interface CompetitorListProps {
  competitors: Competitor[];
}

export function CompetitorList({ competitors }: CompetitorListProps) {
  const platformIcons = {
    airbnb: '🏠',
    'booking.com': '🔖',
    vrbo: '🏡',
    other: '🌐',
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
          Tracked Competitors
        </h3>

        {/* Desktop view - table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                  Competitor
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                  Current Price
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                  Last Updated
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((competitor) => (
                <tr
                  key={competitor.id}
                  className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {platformIcons[competitor.platform as keyof typeof platformIcons] || '🌐'}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {competitor.competitorName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                          {competitor.platform}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {competitor.lastScrapedPrice ? `€${competitor.lastScrapedPrice.toFixed(2)}` : '-'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-400">
                    {competitor.lastScrapedAt
                      ? new Date(competitor.lastScrapedAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <a
                        href={competitor.competitorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        aria-label={`Visit ${competitor.competitorName}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                        aria-label={`Delete ${competitor.competitorName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile view - cards */}
        <div className="md:hidden space-y-4">
          {competitors.map((competitor) => (
            <div
              key={competitor.id}
              className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {platformIcons[competitor.platform as keyof typeof platformIcons] || '🌐'}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {competitor.competitorName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {competitor.platform}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  €{competitor.lastScrapedPrice?.toFixed(2) || '-'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {competitor.lastScrapedAt
                    ? `Updated ${new Date(competitor.lastScrapedAt).toLocaleDateString()}`
                    : 'Not scraped yet'}
                </span>
                <div className="flex gap-2">
                  <a
                    href={competitor.competitorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button className="text-red-600 dark:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
