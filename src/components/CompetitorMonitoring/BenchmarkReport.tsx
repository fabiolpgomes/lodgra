'use client';

import React, { useState, useMemo } from 'react';
import { Download, Filter, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Competitor, CompetitorPriceHistory, MarketPositionAnalysis } from '@/types/competitor';

interface BenchmarkReportProps {
  competitors: Competitor[];
  priceHistory: Record<string, CompetitorPriceHistory[]>;
  analysis: MarketPositionAnalysis;
  propertyName: string;
}

type SortBy = 'name' | 'price' | 'change';
type DateRange = '7' | '14' | '30';

export function BenchmarkReport({
  competitors,
  priceHistory,
  analysis,
  propertyName,
}: BenchmarkReportProps) {
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [dateRange, setDateRange] = useState<DateRange>('7');

  // Calculate price changes
  const competitorMetrics = useMemo(() => {
    return competitors.map((comp) => {
      const history = priceHistory[comp.id] || [];
      const currentPrice = comp.lastScrapedPrice || 0;

      if (history.length === 0 || currentPrice === 0) {
        return { ...comp, priceChange: 0, percentageChange: 0, trend: 'stable' };
      }

      // Find the oldest price in history
      const oldPrice = history[history.length - 1]?.price || currentPrice;
      const newPrice = currentPrice;
      const priceChange = newPrice - oldPrice;
      const percentageChange = oldPrice > 0 ? (priceChange / oldPrice) * 100 : 0;

      return {
        ...comp,
        priceChange,
        percentageChange: Math.round(percentageChange * 100) / 100,
        trend: percentageChange > 2 ? 'up' : percentageChange < -2 ? 'down' : 'stable',
      };
    });
  }, [competitors, priceHistory]);

  // Sort competitors
  const sortedCompetitors = useMemo(() => {
    const sorted = [...competitorMetrics];
    switch (sortBy) {
      case 'price':
        sorted.sort((a, b) => (b.lastScrapedPrice || 0) - (a.lastScrapedPrice || 0));
        break;
      case 'change':
        sorted.sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange));
        break;
      case 'name':
      default:
        sorted.sort((a, b) => a.competitorName.localeCompare(b.competitorName));
    }
    return sorted;
  }, [competitorMetrics, sortBy]);

  // Calculate market volatility (standard deviation)
  const marketVolatility = useMemo(() => {
    const prices = competitors
      .map((c) => c.lastScrapedPrice)
      .filter((p) => p !== null && p !== undefined && p > 0) as number[];

    if (prices.length === 0) return 0;

    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }, [competitors]);

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const rows = [
        ['Benchmark Report', propertyName],
        ['Generated:', new Date().toISOString()],
        ['Date Range:', `Last ${dateRange} days`],
        [],
        [
          'Competitor',
          'Platform',
          'Current Price €',
          '7-Day Change €',
          'Change %',
          'vs Market Avg',
          'Trend',
        ],
      ];

      sortedCompetitors.forEach((comp) => {
        const currentPrice = comp.lastScrapedPrice || 0;
        const vsMarket = currentPrice - analysis.marketAveragePrice;
        rows.push([
          comp.competitorName,
          comp.platform,
          currentPrice > 0 ? currentPrice.toFixed(2) : 'N/A',
          comp.priceChange.toFixed(2),
          `${comp.percentageChange.toFixed(1)}%`,
          `€${vsMarket.toFixed(2)}`,
          comp.trend,
        ]);
      });

      rows.push([]);
      rows.push(['Market Summary']);
      rows.push(['Average Price €', analysis.marketAveragePrice.toFixed(2)]);
      rows.push(['Your Price €', analysis.hostPrice.toFixed(2)]);
      rows.push(['Your Position', analysis.pricePosition.replace('_', ' ').charAt(0).toUpperCase() + analysis.pricePosition.replace('_', ' ').slice(1)]);
      rows.push(['Market Range €', `€${analysis.marketRange.min.toFixed(2)} - €${analysis.marketRange.max.toFixed(2)}`]);
      rows.push(['Volatility (Std Dev) €', marketVolatility.toFixed(2)]);

      const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `benchmark-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Report exported as CSV');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Benchmark Report
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Comprehensive market analysis and competitor pricing
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Date Range:
          </span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Sort By:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="name">Name</option>
            <option value="price">Price (High to Low)</option>
            <option value="change">Price Change %</option>
          </select>
        </div>
      </div>

      {/* Market Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Market Average
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            €{analysis.marketAveragePrice.toFixed(2)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Your Price
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            €{analysis.hostPrice.toFixed(2)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Market Volatility
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            €{marketVolatility.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Competitors Table */}
      <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                Competitor
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                Platform
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                Current Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                7-Day Change
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                vs Market Avg
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                Trend
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {sortedCompetitors.map((comp) => {
              const currentPrice = comp.lastScrapedPrice || 0;
              const vsMarket = currentPrice - analysis.marketAveragePrice;
              const vsMarketColor = vsMarket > 0 ? 'text-red-600' : 'text-green-600';

              return (
                <tr key={comp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {comp.competitorName}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {comp.platform}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                    €{currentPrice > 0 ? currentPrice.toFixed(2) : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div
                      className={`text-sm font-semibold ${comp.percentageChange > 0 ? 'text-red-600' : comp.percentageChange < 0 ? 'text-green-600' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                      €{comp.priceChange.toFixed(2)} ({comp.percentageChange.toFixed(1)}%)
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-semibold ${vsMarketColor}`}>
                    €{vsMarket.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        comp.trend === 'up'
                          ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          : comp.trend === 'down'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {comp.trend === 'up' ? '↑' : comp.trend === 'down' ? '↓' : '→'}{' '}
                      {comp.trend}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Market Range */}
      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
          Market Price Range
        </p>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm text-blue-800 dark:text-blue-300">
          <div>
            <span className="font-medium">Min:</span> €{analysis.marketRange.min.toFixed(2)}
          </div>
          <div>
            <span className="font-medium">Max:</span> €{analysis.marketRange.max.toFixed(2)}
          </div>
          <div>
            <span className="font-medium">Range:</span> €
            {(analysis.marketRange.max - analysis.marketRange.min).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
