'use client';

/**
 * Story 36.6: SeasonalRuleEditor Component
 * Modal for creating/editing seasonal pricing rules
 */

import React, { useState, useCallback, useEffect } from 'react';
import { SeasonalPricingRule } from '@/types/pricing.types';

export interface SeasonalRuleEditorProps {
  rule?: SeasonalPricingRule | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    dateStart: string,
    dateEnd: string,
    pricePerNight: number,
    isActive: boolean
  ) => Promise<void>;
  isLoading?: boolean;
}

export function SeasonalRuleEditor({
  rule,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}: SeasonalRuleEditorProps) {
  const [name, setName] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [pricePerNight, setPricePerNight] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setDateStart(rule.date_start);
      setDateEnd(rule.date_end);
      setPricePerNight(rule.price_per_night.toString());
      setIsActive(rule.is_active);
    } else {
      setName('');
      setDateStart('');
      setDateEnd('');
      setPricePerNight('');
      setIsActive(true);
    }
    setError(null);
  }, [rule, isOpen]);

  const validateForm = useCallback(() => {
    if (!name.trim()) {
      setError('Rule name is required');
      return false;
    }

    if (!dateStart) {
      setError('Start date is required');
      return false;
    }

    if (!dateEnd) {
      setError('End date is required');
      return false;
    }

    if (dateEnd < dateStart) {
      setError('End date must be after or equal to start date');
      return false;
    }

    const price = Number(pricePerNight);
    if (isNaN(price) || price < 0) {
      setError('Price per night must be a positive number');
      return false;
    }

    setError(null);
    return true;
  }, [name, dateStart, dateEnd, pricePerNight]) as () => boolean;

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      await onSave(name.trim(), dateStart, dateEnd, Number(pricePerNight), isActive);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setIsSaving(false);
    }
  }, [name, dateStart, dateEnd, pricePerNight, isActive, validateForm, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg bg-white shadow-lg dark:bg-gray-900">
          {/* Header */}
          <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {rule ? 'Edit Seasonal Rule' : 'Create Seasonal Rule'}
            </h2>
          </div>

          {/* Content */}
          <div className="space-y-4 p-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rule Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., Summer Peak, Winter Discount"
                disabled={isSaving || isLoading}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => {
                    setDateStart(e.target.value);
                    setError(null);
                  }}
                  disabled={isSaving || isLoading}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => {
                    setDateEnd(e.target.value);
                    setError(null);
                  }}
                  disabled={isSaving || isLoading}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
                />
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price per Night (EUR)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pricePerNight}
                onChange={(e) => {
                  setPricePerNight(e.target.value);
                  setError(null);
                }}
                placeholder="0.00"
                disabled={isSaving || isLoading}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isSaving || isLoading}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Active (apply this rule)
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 dark:border-gray-800">
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                disabled={isSaving || isLoading}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:disabled:bg-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-700"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
