'use client';

/**
 * Story 36.6: SeasonalPricingCalendar Component
 * Calendar view highlighting seasonal pricing dates
 */

import React, { useState, useCallback, useMemo } from 'react';
import { SeasonalPricingRule } from '@/types/pricing.types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface SeasonalPricingCalendarProps {
  rules: SeasonalPricingRule[];
  onEditRule?: (rule: SeasonalPricingRule) => void;
  onDeleteRule?: (ruleId: string) => Promise<void>;
}

export function SeasonalPricingCalendar({
  rules,
  onEditRule,
  onDeleteRule,
}: SeasonalPricingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const monthYear = useMemo(() => {
    return {
      month: currentDate.getMonth(),
      year: currentDate.getFullYear(),
    };
  }, [currentDate]);

  const daysInMonth = useMemo(() => {
    return new Date(monthYear.year, monthYear.month + 1, 0).getDate();
  }, [monthYear]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(monthYear.year, monthYear.month, 1).getDay();
  }, [monthYear]);

  const previousMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1));
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1));
  }, []);

  const getSeasonalRulesForDate = useCallback(
    (date: number): SeasonalPricingRule[] => {
      const dateStr = `${monthYear.year}-${String(monthYear.month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      return rules.filter(
        (rule) =>
          rule.is_active &&
          dateStr >= rule.date_start &&
          dateStr <= rule.date_end
      );
    },
    [rules, monthYear]
  );

  const handleDelete = useCallback(
    async (ruleId: string) => {
      if (!onDeleteRule) return;
      try {
        setIsDeleting(ruleId);
        await onDeleteRule(ruleId);
      } finally {
        setIsDeleting(null);
      }
    },
    [onDeleteRule]
  );

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white">Seasonal Rules</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          View active seasonal pricing rules and manage dates
        </p>
      </div>

      {/* Calendar */}
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        {/* Month/Year and Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {monthNames[monthYear.month]} {monthYear.year}
          </h4>
          <div className="flex gap-1">
            <button
              onClick={previousMonth}
              className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={nextMonth}
              className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {dayNames.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12 bg-gray-50 dark:bg-gray-900" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const date = i + 1;
            const seasonalRules = getSeasonalRulesForDate(date);
            const hasRules = seasonalRules.length > 0;

            return (
              <div
                key={date}
                className={`relative h-12 rounded border text-xs p-1 ${
                  hasRules
                    ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-white">{date}</div>
                {hasRules && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {seasonalRules.slice(0, 1).map((rule) => (
                      <span
                        key={rule.id}
                        className="truncate rounded bg-amber-200 px-1 text-amber-900 dark:bg-amber-700 dark:text-amber-100"
                        title={rule.name}
                      >
                        €{rule.price_per_night}
                      </span>
                    ))}
                    {seasonalRules.length > 1 && (
                      <span className="text-gray-600 dark:text-gray-400">
                        +{seasonalRules.length - 1}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules List */}
      <div className="max-h-64 overflow-y-auto">
        <div className="space-y-2">
          {rules.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              No seasonal rules yet
            </p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {rule.name}
                    </span>
                    {!rule.is_active && (
                      <span className="rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {rule.date_start} → {rule.date_end} • €{rule.price_per_night}/night
                  </p>
                </div>
                <div className="flex gap-1">
                  {onEditRule && (
                    <button
                      onClick={() => onEditRule(rule)}
                      className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:text-blue-400"
                    >
                      Edit
                    </button>
                  )}
                  {onDeleteRule && (
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={isDeleting === rule.id}
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:text-gray-400 dark:hover:bg-red-900/20 dark:text-red-400 dark:disabled:text-gray-600"
                    >
                      {isDeleting === rule.id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
