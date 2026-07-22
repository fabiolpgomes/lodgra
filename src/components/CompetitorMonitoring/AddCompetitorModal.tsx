'use client';

import React, { useState, useEffect } from 'react';
import { CompetitorFormData, CompetitorPlatform } from '@/types/competitor';
import { X, AlertCircle } from 'lucide-react';

interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (formData: CompetitorFormData) => Promise<void>;
}

const PLATFORM_PATTERNS = {
  airbnb: /airbnb\.com/,
  'booking.com': /booking\.com/,
  vrbo: /vrbo\.com/,
};

export function AddCompetitorModal({ isOpen, onClose, onAdd }: AddCompetitorModalProps) {
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<CompetitorPlatform>('other');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [threshold, setThreshold] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Detect platform from URL
      for (const [key, pattern] of Object.entries(PLATFORM_PATTERNS)) {
        if (pattern.test(url)) {
          setPlatform(key as CompetitorPlatform);
          return;
        }
      }
      setPlatform('other');
    }
  }, [url, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const isValidUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('www.');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidUrl) {
      setError('Please enter a valid URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await onAdd({
        competitorUrl: url,
        monitoringFrequency: frequency,
        priceAlertThreshold: threshold,
      });

      setUrl('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add competitor');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 id="modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
              Add Competitor
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Competitor URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.airbnb.com/rooms/..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              />
              {platform !== 'other' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Platform detected: <span className="font-medium capitalize">{platform}</span>
                </p>
              )}
            </div>

            {/* Monitoring Frequency */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Monitoring Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Price Alert Threshold */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Alert Threshold: {threshold}%
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Alert when price changes by {threshold}% or more
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValidUrl || loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
              >
                {loading ? 'Adding...' : 'Add Competitor'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
