'use client'

import { useState } from 'react'
import { SettingsTabs } from './SettingsTabs'
import { PriceCard } from './PriceCard'
import { DiscountCard } from './DiscountCard'
import { AvailabilityCard } from './AvailabilityCard'

type TabName = 'prices' | 'discounts' | 'availability'

export function SettingsSidebar() {
  const [activeTab, setActiveTab] = useState<TabName>('prices')

  return (
    <div className="settings-sidebar">
      <SettingsTabs onTabChange={setActiveTab}>
        {activeTab === 'prices' && (
          <>
            <PriceCard
              title="Preço básico"
              value={149}
              action="edit"
              onAction={() => {}}
            />
            <PriceCard
              title="Preço de fim de semana"
              value={157}
              action="remove"
              onAction={() => {}}
            />
            <PriceCard
              title="Preço Inteligente"
              value="Desativado"
              action="toggle"
              onAction={() => {}}
              isActive={false}
            />
          </>
        )}

        {activeTab === 'discounts' && (
          <>
            <DiscountCard
              title="Por semana"
              condition="7 ou mais noites"
              discountPercent={0}
              onEdit={() => {}}
            />
            <DiscountCard
              title="Por mês"
              condition="28 ou mais noites"
              discountPercent={5}
              onEdit={() => {}}
            />
            <DiscountCard
              title="Hóspedes com avaliações excelentes"
              condition="Nota 4.8+"
              discountPercent={15}
              onEdit={() => {}}
            />
          </>
        )}

        {activeTab === 'availability' && (
          <>
            <AvailabilityCard
              title="Número mínimo de noites"
              value={1}
              onEdit={() => {}}
            />
            <AvailabilityCard
              title="Número máximo de noites"
              value={365}
              onEdit={() => {}}
            />
            <AvailabilityCard
              title="Tempo de antecedência"
              value="Mesmo dia"
              onEdit={() => {}}
            />
            <AvailabilityCard
              title="Aviso prévio"
              value="00:00"
              onEdit={() => {}}
            />
            <AvailabilityCard
              title="Tempo de preparação"
              value="Nenhum"
              onEdit={() => {}}
            />
          </>
        )}
      </SettingsTabs>
    </div>
  )
}
