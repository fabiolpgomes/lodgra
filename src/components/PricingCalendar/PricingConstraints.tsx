'use client';

/**
 * Story 36.6: PricingConstraints Component
 * Displays min/max nightly price inputs with live validation
 */

import React, { useState, useCallback } from 'react';
import { PropertyPricingConstraints } from '@/types/pricing.types';
import type { CurrencyCode } from '@/lib/utils/currency';

export interface PricingConstraintsProps {
  constraints: PropertyPricingConstraints | null;
  onUpdate: (min?: number | null, max?: number | null) => Promise<void>;
  isLoading?: boolean;
  currency?: CurrencyCode;
}

export function PricingConstraints({
  constraints,
  onUpdate,
  isLoading = false,
  currency,
}: PricingConstraintsProps) {
  const [minPrice, setMinPrice] = useState(constraints?.min_nightly_price ?? '');
  const [maxPrice, setMaxPrice] = useState(constraints?.max_nightly_price ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (constraints) {
      setMinPrice(constraints.min_nightly_price ?? '');
      setMaxPrice(constraints.max_nightly_price ?? '');
    }
  }, [constraints]);

  const validateInputs = useCallback(() => {
    const min = minPrice === '' ? null : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);

    if (min !== null && min < 0) {
      setError('O preço mínimo não pode ser negativo');
      return false;
    }

    if (max !== null && max < 0) {
      setError('O preço máximo não pode ser negativo');
      return false;
    }

    if (min !== null && max !== null && min > max) {
      setError('O preço mínimo não pode exceder o preço máximo');
      return false;
    }

    setError(null);
    return true;
  }, [minPrice, maxPrice]) as () => boolean;

  const handleSave = useCallback(async () => {
    if (!validateInputs()) return;

    try {
      setIsSaving(true);
      const min = minPrice === '' ? null : Number(minPrice);
      const max = maxPrice === '' ? null : Number(maxPrice);
      await onUpdate(min, max);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar as restrições');
    } finally {
      setIsSaving(false);
    }
  }, [minPrice, maxPrice, onUpdate, validateInputs]);

  const handleReset = useCallback(() => {
    if (constraints) {
      setMinPrice(constraints.min_nightly_price ?? '');
      setMaxPrice(constraints.max_nightly_price ?? '');
      setError(null);
      setSuccess(false);
    }
  }, [constraints]);

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white">Restrições de preço</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Defina preços mínimos e máximos por noite para evitar preços demasiado altos ou baixos por engano
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Minimum Price */}
        <div>
          <label htmlFor="min-price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Preço mínimo por noite{currency ? ` (${currency})` : ''}
          </label>
          <input
            id="min-price"
            type="number"
            min="0"
            step="0.01"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setError(null);
            }}
            disabled={isLoading || isSaving}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
            placeholder="Sem mínimo"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Deixe vazio para não definir mínimo
          </p>
        </div>

        {/* Maximum Price */}
        <div>
          <label htmlFor="max-price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Preço máximo por noite{currency ? ` (${currency})` : ''}
          </label>
          <input
            id="max-price"
            type="number"
            min="0"
            step="0.01"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setError(null);
            }}
            disabled={isLoading || isSaving}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
            placeholder="Sem máximo"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Deixe vazio para não definir máximo
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
          Restrições de preço atualizadas com sucesso
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-700"
        >
          {isSaving ? 'A guardar...' : 'Guardar'}
        </button>
        <button
          onClick={handleReset}
          disabled={isLoading || isSaving}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:disabled:bg-gray-900"
        >
          Repor
        </button>
      </div>
    </div>
  );
}
