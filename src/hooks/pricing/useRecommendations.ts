'use client';

/**
 * useRecommendations - Custom hook for managing price recommendations
 * Story 36.8: Handles fetching, accepting, and rejecting recommendations
 */

import { useState, useCallback, useEffect } from 'react';
import type { PriceRecommendation } from '@/types/pricing.types';

interface UseRecommendationsReturn {
  recommendations: PriceRecommendation[];
  isLoading: boolean;
  error: string | null;
  fetchRecommendations: () => Promise<void>;
  acceptRecommendation: (recommendationId: string, applyImmediately: boolean) => Promise<void>;
  rejectRecommendation: (recommendationId: string) => Promise<void>;
}

export function useRecommendations(propertyId: string): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<PriceRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!propertyId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/properties/${propertyId}/recommendations`);
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      if (data.success && data.data?.recommendations) {
        setRecommendations(data.data.recommendations);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch recommendations';
      setError(message);
      console.error('Error fetching recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  const acceptRecommendation = useCallback(
    async (recommendationId: string, applyImmediately: boolean) => {
      try {
        const response = await fetch(
          `/api/properties/${propertyId}/recommendations/${recommendationId}/accept`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ applyImmediately }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to accept recommendation');
        }

        // Update local state
        setRecommendations((prev) =>
          prev.map((rec) =>
            rec.id === recommendationId
              ? {
                  ...rec,
                  accepted: true,
                  accepted_at: new Date().toISOString(),
                  rejected_at: null,
                }
              : rec
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to accept recommendation';
        console.error('Error accepting recommendation:', err);
        throw new Error(message);
      }
    },
    [propertyId]
  );

  const rejectRecommendation = useCallback(
    async (recommendationId: string) => {
      try {
        // Note: This would require a reject endpoint - for now we just update locally
        // POST /api/properties/:id/recommendations/:id/reject
        const response = await fetch(
          `/api/properties/${propertyId}/recommendations/${recommendationId}/reject`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to reject recommendation');
        }

        // Update local state
        setRecommendations((prev) =>
          prev.map((rec) =>
            rec.id === recommendationId
              ? {
                  ...rec,
                  accepted: false,
                  rejected_at: new Date().toISOString(),
                  accepted_at: undefined,
                }
              : rec
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reject recommendation';
        console.error('Error rejecting recommendation:', err);
        throw new Error(message);
      }
    },
    [propertyId]
  );

  // Fetch on mount
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    isLoading,
    error,
    fetchRecommendations,
    acceptRecommendation,
    rejectRecommendation,
  };
}
