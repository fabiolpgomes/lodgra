/**
 * Story 36.2: Settings Tabs Container (Main Component)
 * Manages 3 pricing configuration tabs
 */

import { useState, useEffect } from 'react';
import { TabPrecos } from './TabPrecos';
import { TabDescontos } from './TabDescontos';
import { TabDisponibilidade } from './TabDisponibilidade';
import { usePricingSettings } from '@/hooks/usePricingSettings';

type TabType = 'precos' | 'descontos' | 'disponibilidade';

interface SettingsTabsProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsTabs({ propertyId, isOpen, onClose }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('precos');
  const [basePrice, setBasePrice] = useState(0);
  const { fetchPrices } = usePricingSettings(propertyId);

  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const res = await fetchPrices();
          if (res.data) {
            setBasePrice(res.data.base_price || 0);
          }
        } catch {
          // Error handled
        }
      })();
    }
  }, [isOpen, fetchPrices]);

  if (!isOpen) return null;

  const handlePricesSaved = async () => {
    try {
      const res = await fetchPrices();
      if (res.data) {
        setBasePrice(res.data.base_price || 0);
      }
    } catch {
      // Error handled
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center sm:justify-center z-50">
      <div className="bg-white w-full sm:w-full sm:max-w-md rounded-t-lg sm:rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Configurações</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('precos')}
            className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
              activeTab === 'precos'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Preços
          </button>
          <button
            onClick={() => setActiveTab('descontos')}
            className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
              activeTab === 'descontos'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Descontos
          </button>
          <button
            onClick={() => setActiveTab('disponibilidade')}
            className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
              activeTab === 'disponibilidade'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Disponibilidade
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'precos' && (
            <TabPrecos propertyId={propertyId} onSaved={handlePricesSaved} />
          )}
          {activeTab === 'descontos' && (
            <TabDescontos propertyId={propertyId} basePrice={basePrice} />
          )}
          {activeTab === 'disponibilidade' && (
            <TabDisponibilidade propertyId={propertyId} />
          )}
        </div>
      </div>
    </div>
  );
}
