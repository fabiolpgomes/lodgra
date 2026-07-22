'use client';

import React, { useState, useCallback } from 'react';
import { useCompetitorMonitoring } from '@/hooks/useCompetitorMonitoring';
import { MarketPositionCard } from './MarketPositionCard';
import { CompetitorList } from './CompetitorList';
import { AlertNotifications } from './AlertNotifications';
import { AddCompetitorModal } from './AddCompetitorModal';
import { CompetitorPreferencesModal } from './CompetitorPreferencesModal';
import { BenchmarkReport } from './BenchmarkReport';
import { Plus, Settings, RefreshCw, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface CompetitorDashboardProps {
  propertyId: string;
  propertyName: string;
}

export function CompetitorDashboard({ propertyId, propertyName }: CompetitorDashboardProps) {
  const { data, isLoading, error, refresh, addCompetitor } = useCompetitorMonitoring(propertyId);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'report'>('list');

  const handleAddCompetitor = useCallback(
    async (formData: any) => {
      try {
        await addCompetitor(formData);
        setShowAddModal(false);
        toast.success('Competitor added successfully');
      } catch (error) {
        toast.error('Failed to add competitor');
      }
    },
    [addCompetitor]
  );

  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh');
    }
  }, [refresh]);

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Competitor Monitoring
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Monitor competitive prices for {propertyName}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh competitor data"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">Refresh</span>
          </button>

          <button
            onClick={() => setShowPreferencesModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 rounded-md transition-colors"
            aria-label="Alert preferences"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Preferences</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            aria-label="Add Competitor"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Competitor</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      {error && !data && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {isLoading && !data ? (
        <div className="space-y-4">
          <div className="bg-slate-200 dark:bg-slate-700 rounded-lg h-32 animate-pulse" />
          <div className="bg-slate-200 dark:bg-slate-700 rounded-lg h-64 animate-pulse" />
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Market Position Card */}
          <MarketPositionCard analysis={data.analysis} />

          {/* Recent Alerts */}
          {data.recentAlerts && data.recentAlerts.length > 0 && (
            <AlertNotifications alerts={data.recentAlerts} />
          )}

          {/* View Tabs */}
          {data.competitors && data.competitors.length > 0 && (
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveView('list')}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeView === 'list'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4" />
                Competitors
              </button>
              <button
                onClick={() => setActiveView('report')}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeView === 'report'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Benchmark Report
              </button>
            </div>
          )}

          {/* Competitor List or Benchmark Report */}
          {data.competitors && data.competitors.length > 0 ? (
            activeView === 'list' ? (
              <CompetitorList competitors={data.competitors} />
            ) : (
              <BenchmarkReport
                competitors={data.competitors}
                priceHistory={data.priceHistory}
                analysis={data.analysis}
                propertyName={propertyName}
              />
            )
          ) : (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
              <p className="text-blue-800 dark:text-blue-200 mb-4">
                No competitors tracked yet. Add one to get started.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Competitor
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Modals */}
      <AddCompetitorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddCompetitor}
      />

      <CompetitorPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
      />
    </div>
  );
}
