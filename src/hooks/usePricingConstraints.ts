/**
 * Story 36.6: Pricing Constraints Hook
 * Manages min/max pricing constraints and seasonal rules
 */

import { useCallback, useState, useEffect } from 'react';
import { SeasonalPricingRule, PropertyPricingConstraints } from '@/types/pricing.types';

export interface UsePricingConstraintsReturn {
  constraints: PropertyPricingConstraints | null;
  seasonalRules: SeasonalPricingRule[];
  isLoading: boolean;
  error: Error | null;
  fetchConstraints: () => Promise<void>;
  fetchSeasonalRules: () => Promise<void>;
  updateConstraints: (min?: number | null, max?: number | null) => Promise<void>;
  createSeasonalRule: (
    name: string,
    dateStart: string,
    dateEnd: string,
    pricePerNight: number
  ) => Promise<SeasonalPricingRule>;
  updateSeasonalRule: (
    ruleId: string,
    updates: Partial<Omit<SeasonalPricingRule, 'id' | 'property_id'>>
  ) => Promise<void>;
  deleteSeasonalRule: (ruleId: string) => Promise<void>;
  toggleSeasonalRule: (ruleId: string, isActive: boolean) => Promise<void>;
}

export function usePricingConstraints(propertyId: string): UsePricingConstraintsReturn {
  const [constraints, setConstraints] = useState<PropertyPricingConstraints | null>(null);
  const [seasonalRules, setSeasonalRules] = useState<SeasonalPricingRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConstraints = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/properties/${propertyId}/pricing-constraints`);
      if (!res.ok) {
        throw new Error('Failed to fetch pricing constraints');
      }

      const json = await res.json();
      setConstraints(json.data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  const fetchSeasonalRules = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/properties/${propertyId}/seasonal-rules`);
      if (!res.ok) {
        throw new Error('Failed to fetch seasonal rules');
      }

      const json = await res.json();
      setSeasonalRules(json.data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  const updateConstraints = useCallback(
    async (min?: number | null, max?: number | null) => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/properties/${propertyId}/pricing-constraints`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            min_nightly_price: min ?? null,
            max_nightly_price: max ?? null,
          }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to update constraints');
        }

        const json = await res.json();
        setConstraints(json.data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [propertyId]
  );

  const createSeasonalRule = useCallback(
    async (
      name: string,
      dateStart: string,
      dateEnd: string,
      pricePerNight: number
    ): Promise<SeasonalPricingRule> => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/properties/${propertyId}/seasonal-rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            date_start: dateStart,
            date_end: dateEnd,
            price_per_night: pricePerNight,
          }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to create seasonal rule');
        }

        const json = await res.json();
        const newRule = json.data;

        // Update local state
        setSeasonalRules((prev) => [...prev, newRule].sort((a, b) => a.date_start.localeCompare(b.date_start)));

        return newRule;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [propertyId]
  );

  const updateSeasonalRule = useCallback(
    async (
      ruleId: string,
      updates: Partial<Omit<SeasonalPricingRule, 'id' | 'property_id'>>
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        const payload: Record<string, unknown> = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.date_start !== undefined) payload.date_start = updates.date_start;
        if (updates.date_end !== undefined) payload.date_end = updates.date_end;
        if (updates.price_per_night !== undefined) payload.price_per_night = updates.price_per_night;
        if (updates.is_active !== undefined) payload.is_active = updates.is_active;

        const res = await fetch(`/api/properties/${propertyId}/seasonal-rules/${ruleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to update seasonal rule');
        }

        const json = await res.json();
        const updatedRule = json.data;

        // Update local state
        setSeasonalRules((prev) =>
          prev
            .map((rule) => (rule.id === ruleId ? updatedRule : rule))
            .sort((a, b) => a.date_start.localeCompare(b.date_start))
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [propertyId]
  );

  const deleteSeasonalRule = useCallback(
    async (ruleId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/properties/${propertyId}/seasonal-rules/${ruleId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to delete seasonal rule');
        }

        // Update local state
        setSeasonalRules((prev) => prev.filter((rule) => rule.id !== ruleId));
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [propertyId]
  );

  const toggleSeasonalRule = useCallback(
    async (ruleId: string, isActive: boolean) => {
      return updateSeasonalRule(ruleId, { is_active: isActive });
    },
    [updateSeasonalRule]
  );

  // Initial fetch
  useEffect(() => {
    fetchConstraints();
    fetchSeasonalRules();
  }, [fetchConstraints, fetchSeasonalRules]);

  return {
    constraints,
    seasonalRules,
    isLoading,
    error,
    fetchConstraints,
    fetchSeasonalRules,
    updateConstraints,
    createSeasonalRule,
    updateSeasonalRule,
    deleteSeasonalRule,
    toggleSeasonalRule,
  };
}
