/**
 * Custom hook for competitor price monitoring (Story 36.10)
 */

import { useState, useEffect, useCallback } from 'react';
import { CompetitorMonitoringAPIResponse, CompetitorFormData } from '@/types/competitor';

export function useCompetitorMonitoring(propertyId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompetitorMonitoringAPIResponse | null>(null);

  const fetchCompetitors = useCallback(async () => {
    if (!propertyId) {
      setError('Property ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/properties/${propertyId}/competitors`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch competitor data');
      }

      const competitorData: CompetitorMonitoringAPIResponse = await response.json();
      setData(competitorData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Competitor monitoring fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  // Fetch on mount and when propertyId changes
  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  const addCompetitor = useCallback(
    async (formData: CompetitorFormData) => {
      if (!propertyId) {
        throw new Error('Property ID is required');
      }

      try {
        const response = await fetch(`/api/properties/${propertyId}/competitors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add competitor');
        }

        // Refresh data after adding
        await fetchCompetitors();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add competitor';
        setError(errorMessage);
        throw err;
      }
    },
    [propertyId, fetchCompetitors]
  );

  const removeCompetitor = useCallback(
    async (competitorId: string) => {
      if (!propertyId) {
        throw new Error('Property ID is required');
      }

      try {
        const response = await fetch(`/api/properties/${propertyId}/competitors`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ competitorId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete competitor');
        }

        // Refresh data after deletion
        await fetchCompetitors();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete competitor';
        setError(errorMessage);
        throw err;
      }
    },
    [propertyId, fetchCompetitors]
  );

  const updateCompetitor = useCallback(
    async (competitorId: string, updates: any) => {
      if (!propertyId) {
        throw new Error('Property ID is required');
      }

      try {
        const response = await fetch(`/api/properties/${propertyId}/competitors/${competitorId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update competitor');
        }

        // Refresh data after update
        await fetchCompetitors();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update competitor';
        setError(errorMessage);
        throw err;
      }
    },
    [propertyId, fetchCompetitors]
  );

  const dismissAlert = useCallback(
    async (alertId: string) => {
      if (!propertyId) {
        throw new Error('Property ID is required');
      }

      try {
        const response = await fetch(`/api/properties/${propertyId}/competitors/alerts/${alertId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });

        if (!response.ok) {
          throw new Error('Failed to dismiss alert');
        }

        // Refresh data after dismissing
        await fetchCompetitors();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to dismiss alert';
        console.error(errorMessage);
        throw err;
      }
    },
    [propertyId, fetchCompetitors]
  );

  const refresh = useCallback(async () => {
    await fetchCompetitors();
  }, [fetchCompetitors]);

  return {
    isLoading,
    error,
    data,
    addCompetitor,
    removeCompetitor,
    updateCompetitor,
    dismissAlert,
    refresh,
  };
}
