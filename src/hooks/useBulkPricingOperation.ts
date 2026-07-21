/**
 * Story 36.5: Bulk Pricing Operation Hook
 * Manages bulk price operations with undo/redo and optimistic updates
 */

import { useCallback, useState } from 'react';
import { DailyPrice } from '@/types/calendar.types';

export interface BulkOperationConfig {
  operationType: 'price' | 'discount' | 'copy' | 'delete';
  startDate: Date;
  endDate: Date;
  price?: number;
  discountPercent?: number;
  sourceDate?: Date;
  propertyId: string;
  currentPrices: Map<string, DailyPrice>;
}

interface OperationHistoryItem {
  config: BulkOperationConfig;
  affectedDates: string[];
  previousPrices: Map<string, DailyPrice>;
  timestamp: number;
}

interface UseBulkPricingOperationReturn {
  applyBulkPrice: (config: BulkOperationConfig) => Promise<void>;
  applyBulkDiscount: (config: BulkOperationConfig) => Promise<void>;
  copyPriceToRange: (config: BulkOperationConfig) => Promise<void>;
  bulkDeleteOverrides: (config: BulkOperationConfig) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  isLoading: boolean;
  error: Error | null;
  getAffectedDates: (startDate: Date, endDate: Date) => string[];
}

export function useBulkPricingOperation(
  propertyId: string,
  onPricesUpdate?: (prices: Map<string, DailyPrice>) => void
): UseBulkPricingOperationReturn {
  const [history, setHistory] = useState<OperationHistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get all dates in range
  const getAffectedDates = useCallback((startDate: Date, endDate: Date): string[] => {
    const dates: string[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      dates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }, []);

  // Apply bulk price to range
  const applyBulkPrice = useCallback(
    async (config: BulkOperationConfig) => {
      if (config.price === undefined) {
        throw new Error('Price is required for bulk price operation');
      }

      const affectedDates = getAffectedDates(config.startDate, config.endDate);
      const previousPrices = new Map(config.currentPrices);

      try {
        setIsLoading(true);
        setError(null);

        // Optimistic update
        const updates = affectedDates.map((date) => ({
          date,
          price: config.price!,
        }));

        // Make batch API call
        const res = await fetch(
          `/api/properties/${propertyId}/daily-prices/bulk`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operations: updates }),
          }
        );

        if (!res.ok) {
          throw new Error('Failed to apply bulk price');
        }

        // Add to history
        const operation: OperationHistoryItem = {
          config,
          affectedDates,
          previousPrices,
          timestamp: Date.now(),
        };

        setHistory((prev) => {
          const newHistory = prev.slice(0, currentIndex + 1);
          newHistory.push(operation);
          if (newHistory.length > 5) {
            newHistory.shift();
          }
          return newHistory;
        });

        setCurrentIndex((prev) =>
          Math.min(prev + 1, Math.min(history.length, 4))
        );

        // Trigger callback for UI update
        if (onPricesUpdate) {
          const updated = new Map(config.currentPrices);
          affectedDates.forEach((date) => {
            const existing = updated.get(date) || {
              date,
              price: 0,
              property_id: propertyId,
            };
            updated.set(date, { ...existing, date, price: config.price! });
          });
          onPricesUpdate(updated);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [propertyId, currentIndex, history.length, getAffectedDates, onPricesUpdate]
  );

  // Apply bulk discount to range
  const applyBulkDiscount = useCallback(
    async (config: BulkOperationConfig) => {
      if (config.discountPercent === undefined) {
        throw new Error('Discount percent is required for bulk discount operation');
      }

      const affectedDates = getAffectedDates(config.startDate, config.endDate);
      const previousPrices = new Map(config.currentPrices);

      try {
        setIsLoading(true);
        setError(null);

        // Calculate discounted prices
        const updates = affectedDates.map((date) => {
          const existing = config.currentPrices.get(date);
          const basePrice = existing?.price || 0;
          const discountedPrice = Math.round(
            basePrice * (1 - config.discountPercent! / 100)
          );
          return {
            date,
            price: discountedPrice,
          };
        });

        // Make batch API call
        const res = await fetch(
          `/api/properties/${propertyId}/daily-prices/bulk`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operations: updates }),
          }
        );

        if (!res.ok) {
          throw new Error('Failed to apply bulk discount');
        }

        // Add to history
        const operation: OperationHistoryItem = {
          config,
          affectedDates,
          previousPrices,
          timestamp: Date.now(),
        };

        setHistory((prev) => {
          const newHistory = prev.slice(0, currentIndex + 1);
          newHistory.push(operation);
          if (newHistory.length > 5) {
            newHistory.shift();
          }
          return newHistory;
        });

        setCurrentIndex((prev) =>
          Math.min(prev + 1, Math.min(history.length, 4))
        );

        // Trigger callback for UI update
        if (onPricesUpdate) {
          const updated = new Map(config.currentPrices);
          updates.forEach((update) => {
            const existing = updated.get(update.date) || {
              date: update.date,
              price: 0,
              property_id: propertyId,
            };
            updated.set(update.date, {
              ...existing,
              date: update.date,
              price: update.price,
            });
          });
          onPricesUpdate(updated);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [propertyId, currentIndex, history.length, getAffectedDates, onPricesUpdate]
  );

  // Copy price from source date to range
  const copyPriceToRange = useCallback(
    async (config: BulkOperationConfig) => {
      if (!config.sourceDate) {
        throw new Error('Source date is required for copy operation');
      }

      const sourceDateStr = config.sourceDate.toISOString().split('T')[0];
      const sourcePrice = config.currentPrices.get(sourceDateStr)?.price;

      if (sourcePrice === undefined) {
        throw new Error('Source date has no price set');
      }

      const affectedDates = getAffectedDates(config.startDate, config.endDate);
      const previousPrices = new Map(config.currentPrices);

      try {
        setIsLoading(true);
        setError(null);

        // Create updates with source price
        const updates = affectedDates.map((date) => ({
          date,
          price: sourcePrice,
        }));

        // Make batch API call
        const res = await fetch(
          `/api/properties/${propertyId}/daily-prices/bulk`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operations: updates }),
          }
        );

        if (!res.ok) {
          throw new Error('Failed to copy price to range');
        }

        // Add to history
        const operation: OperationHistoryItem = {
          config,
          affectedDates,
          previousPrices,
          timestamp: Date.now(),
        };

        setHistory((prev) => {
          const newHistory = prev.slice(0, currentIndex + 1);
          newHistory.push(operation);
          if (newHistory.length > 5) {
            newHistory.shift();
          }
          return newHistory;
        });

        setCurrentIndex((prev) =>
          Math.min(prev + 1, Math.min(history.length, 4))
        );

        // Trigger callback for UI update
        if (onPricesUpdate) {
          const updated = new Map(config.currentPrices);
          affectedDates.forEach((date) => {
            const existing = updated.get(date) || {
              date,
              price: 0,
              property_id: propertyId,
            };
            updated.set(date, {
              ...existing,
              date,
              price: sourcePrice,
            });
          });
          onPricesUpdate(updated);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [propertyId, currentIndex, history.length, getAffectedDates, onPricesUpdate]
  );

  // Bulk delete overrides
  const bulkDeleteOverrides = useCallback(
    async (config: BulkOperationConfig) => {
      const affectedDates = getAffectedDates(config.startDate, config.endDate);
      const previousPrices = new Map(config.currentPrices);

      try {
        setIsLoading(true);
        setError(null);

        // Make batch delete API call
        const res = await fetch(
          `/api/properties/${propertyId}/daily-prices/bulk`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dates: affectedDates }),
          }
        );

        if (!res.ok) {
          throw new Error('Failed to delete overrides');
        }

        // Add to history
        const operation: OperationHistoryItem = {
          config,
          affectedDates,
          previousPrices,
          timestamp: Date.now(),
        };

        setHistory((prev) => {
          const newHistory = prev.slice(0, currentIndex + 1);
          newHistory.push(operation);
          if (newHistory.length > 5) {
            newHistory.shift();
          }
          return newHistory;
        });

        setCurrentIndex((prev) =>
          Math.min(prev + 1, Math.min(history.length, 4))
        );

        // Trigger callback for UI update
        if (onPricesUpdate) {
          const updated = new Map(config.currentPrices);
          affectedDates.forEach((date) => {
            updated.delete(date);
          });
          onPricesUpdate(updated);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [propertyId, currentIndex, history.length, getAffectedDates, onPricesUpdate]
  );

  // Undo operation
  const undo = useCallback(async () => {
    if (currentIndex < 0) return;

    try {
      setIsLoading(true);
      setError(null);

      const operation = history[currentIndex];

      // Restore previous prices
      const updates = Array.from(operation.previousPrices.entries()).map(
        ([date, price]) => ({
          date,
          price: price.price,
        })
      );

      // Also delete any dates that didn't exist before
      const deletedDates = operation.affectedDates.filter(
        (date) => !operation.previousPrices.has(date)
      );

      if (updates.length > 0) {
        const res = await fetch(
          `/api/properties/${propertyId}/daily-prices/bulk`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operations: updates }),
          }
        );

        if (!res.ok) {
          throw new Error('Failed to undo operation');
        }
      }

      if (deletedDates.length > 0) {
        const res = await fetch(
          `/api/properties/${propertyId}/daily-prices/bulk`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dates: deletedDates }),
          }
        );

        if (!res.ok) {
          throw new Error('Failed to delete prices during undo');
        }
      }

      setCurrentIndex((prev) => prev - 1);

      // Trigger callback for UI update
      if (onPricesUpdate) {
        onPricesUpdate(new Map(operation.previousPrices));
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentIndex, history, propertyId, onPricesUpdate]);

  // Redo operation
  const redo = useCallback(async () => {
    if (currentIndex >= history.length - 1 || history.length === 0) return;

    try {
      setIsLoading(true);
      setError(null);

      const nextIndex = currentIndex + 1;
      const operation = history[nextIndex];

      // Re-apply the operation based on type
      switch (operation.config.operationType) {
        case 'price':
          await applyBulkPrice(operation.config);
          break;
        case 'discount':
          await applyBulkDiscount(operation.config);
          break;
        case 'copy':
          await copyPriceToRange(operation.config);
          break;
        case 'delete':
          await bulkDeleteOverrides(operation.config);
          break;
      }

      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    currentIndex,
    history,
    applyBulkPrice,
    applyBulkDiscount,
    copyPriceToRange,
    bulkDeleteOverrides,
  ]);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1 && history.length > 0;

  return {
    applyBulkPrice,
    applyBulkDiscount,
    copyPriceToRange,
    bulkDeleteOverrides,
    undo,
    redo,
    canUndo,
    canRedo,
    isLoading,
    error,
    getAffectedDates,
  };
}
