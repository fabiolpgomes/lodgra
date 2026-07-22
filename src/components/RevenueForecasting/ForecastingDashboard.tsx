'use client';

import React, { useState, useCallback } from 'react';
import { useForecastData } from '@/hooks/useForecastData';
import { generateForecastPDF } from '@/lib/export/pdfExport';
import { generateForecastCSV } from '@/lib/export/csvExport';
import { ForecastCards } from './ForecastCards';
import { ForecastChart } from './ForecastChart';
import { StatisticsCards } from './StatisticsCards';
import { ForecastDetailsModal } from './ForecastDetailsModal';
import { RevenueForecast } from '@/types/forecasting';
import { Download, FileJson } from 'lucide-react';
import { toast } from 'sonner';

interface ForecastingDashboardProps {
  propertyId: string;
  propertyName: string;
}

export function ForecastingDashboard({ propertyId, propertyName }: ForecastingDashboardProps) {
  const { data, isLoading, error, refresh } = useForecastData(propertyId);
  const [selectedPeriod, setSelectedPeriod] = useState<'30' | '60' | '90' | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Get selected forecast
  const selectedForecast = selectedPeriod
    ? data?.forecasts[`days${selectedPeriod}` as keyof typeof data.forecasts]
    : null;

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setSelectedPeriod(null);
  }, []);

  // Handle card click to open modal
  const handleCardClick = useCallback((period: '30' | '60' | '90') => {
    setSelectedPeriod(period);
  }, []);

  // Handle PDF export
  const handlePdfExport = useCallback(async () => {
    if (!data) {
      toast.error('No forecast data to export');
      return;
    }

    try {
      setIsExporting(true);
      const startDate = new Date().toLocaleDateString();
      const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString();

      await generateForecastPDF(data, propertyName, startDate, endDate);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  }, [data, propertyName]);

  // Handle CSV export
  const handleCsvExport = useCallback(() => {
    if (!data) {
      toast.error('No forecast data to export');
      return;
    }

    try {
      const startDate = new Date().toLocaleDateString();
      const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString();

      generateForecastCSV(data, propertyName, startDate, endDate);
      toast.success('CSV downloaded successfully');
    } catch (err) {
      console.error('CSV export error:', err);
      toast.error('Failed to generate CSV');
    }
  }, [data, propertyName]);

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Revenue Forecasting
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Projected revenue analysis for {propertyName}
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          <button
            onClick={handlePdfExport}
            disabled={!data || isLoading || isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            aria-label="Download PDF report"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">PDF</span>
          </button>

          <button
            onClick={handleCsvExport}
            disabled={!data || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            aria-label="Download CSV export"
          >
            <FileJson className="w-4 h-4" />
            <span className="text-sm font-medium">CSV</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="space-y-8">
        {/* Forecast Cards */}
        <section aria-labelledby="forecast-heading">
          <h2 id="forecast-heading" className="sr-only">
            Forecast Cards
          </h2>
          <ForecastCards
            data={data}
            isLoading={isLoading}
            error={error}
            onCardClick={handleCardClick}
            onRefresh={refresh}
          />
        </section>

        {/* Chart */}
        {data && !isLoading && (
          <section aria-labelledby="chart-heading">
            <h2 id="chart-heading" className="sr-only">
              Revenue Forecast Chart
            </h2>
            <ForecastChart data={data} period={selectedPeriod || '90'} />
          </section>
        )}

        {/* Statistics */}
        {data && !isLoading && (
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="sr-only">
              Key Statistics
            </h2>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                Key Statistics
              </h3>
              <StatisticsCards data={data} />
            </div>
          </section>
        )}
      </div>

      {/* Details Modal */}
      <ForecastDetailsModal
        isOpen={selectedPeriod !== null}
        onClose={handleCloseModal}
        forecast={selectedForecast || null}
        data={data}
        period={selectedPeriod || '30'}
      />
    </div>
  );
}
