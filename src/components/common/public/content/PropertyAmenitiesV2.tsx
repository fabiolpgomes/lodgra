'use client'

import { useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { LucideProps, X } from 'lucide-react'
import {
  Wifi, Wind, Thermometer, ChefHat, Car, Waves,
  Tv, Shirt, Baby, Dumbbell, Coffee, UtensilsCrossed,
  AirVent, Lock, PawPrint, Cigarette, Mountain, Sun,
  type LucideIcon,
} from 'lucide-react'

// ── Legacy amenity map (properties.amenities string array) ────────────────────

interface AmenityDef {
  icon: LucideIcon
  label: string
  category: string
}

const AMENITY_MAP: Record<string, AmenityDef> = {
  wifi:             { icon: Wifi,            label: 'WiFi',                category: 'Essenciais' },
  air_conditioning: { icon: Wind,            label: 'Ar condicionado',     category: 'Essenciais' },
  heating:          { icon: Thermometer,     label: 'Aquecimento',         category: 'Essenciais' },
  tv:               { icon: Tv,              label: 'Televisão',           category: 'Essenciais' },
  washer:           { icon: Shirt,           label: 'Máquina de lavar',    category: 'Essenciais' },
  kitchen:          { icon: ChefHat,         label: 'Cozinha equipada',    category: 'Cozinha' },
  dishwasher:       { icon: UtensilsCrossed, label: 'Máq. lavar louça',    category: 'Cozinha' },
  microwave:        { icon: AirVent,         label: 'Microondas',          category: 'Cozinha' },
  coffee_maker:     { icon: Coffee,          label: 'Máquina de café',     category: 'Cozinha' },
  pool:             { icon: Waves,           label: 'Piscina',             category: 'Exterior' },
  parking:          { icon: Car,             label: 'Estacionamento',      category: 'Exterior' },
  garden:           { icon: Mountain,        label: 'Jardim',              category: 'Exterior' },
  terrace:          { icon: Sun,             label: 'Terraço/Varanda',     category: 'Exterior' },
  gym:              { icon: Dumbbell,        label: 'Ginásio',             category: 'Extra' },
  crib:             { icon: Baby,            label: 'Berço disponível',    category: 'Extra' },
  pets_allowed:     { icon: PawPrint,        label: 'Animais permitidos',  category: 'Extra' },
  smoking_allowed:  { icon: Cigarette,       label: 'Fumar permitido',     category: 'Extra' },
  safe:             { icon: Lock,            label: 'Cofre',               category: 'Extra' },
}

// ── New structured amenity (from property_amenities + amenities tables) ───────

export interface StructuredAmenity {
  id: string
  name: string
  icon: string
  category: string
}

const CATEGORY_LABELS: Record<string, string> = {
  destaque: 'Destaques',
  geral: 'Geral',
  sala: 'Sala',
  quarto: 'Quarto',
  cozinha: 'Cozinha',
  banheiro: 'Casa de banho',
  seguranca: 'Segurança',
}

const CATEGORY_ORDER = ['destaque', 'geral', 'sala', 'quarto', 'cozinha', 'banheiro', 'seguranca']

function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = LucideIcons[name as keyof typeof LucideIcons] as React.ComponentType<LucideProps> | undefined
  const FallbackIcon = AirVent
  return Icon ? <Icon {...props} /> : <FallbackIcon {...props} />
}

// ── Component ─────────────────────────────────────────────────────────────────

const PREVIEW_COUNT = 8

interface PropertyAmenitiesV2Props {
  amenities?: string[]
  structuredAmenities?: StructuredAmenity[]
}

export function PropertyAmenitiesV2({ amenities = [], structuredAmenities }: PropertyAmenitiesV2Props) {
  const [showAll, setShowAll] = useState(false)

  const useStructured = structuredAmenities && structuredAmenities.length > 0

  // ── Structured (new system) ────────────────────────────────────────────────
  if (useStructured) {
    const preview = structuredAmenities.slice(0, PREVIEW_COUNT)
    const categorised = CATEGORY_ORDER.reduce<Record<string, StructuredAmenity[]>>((acc, cat) => {
      const items = structuredAmenities.filter(a => a.category === cat)
      if (items.length) acc[cat] = items
      return acc
    }, {})

    return (
      <section aria-label="Comodidades">
        <h2 className="text-xl font-semibold text-lodgra-neutral-900 mb-4">Comodidades</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {preview.map(a => (
            <div key={a.id} className="flex items-center gap-2.5 text-sm text-lodgra-neutral-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lodgra-brand-50 shrink-0">
                <DynamicIcon name={a.icon} className="h-4 w-4 text-lodgra-brand-500" />
              </span>
              {a.name}
            </div>
          ))}
        </div>

        {structuredAmenities.length > PREVIEW_COUNT && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-4 text-sm font-semibold text-lodgra-brand-600 hover:text-lodgra-brand-500 underline underline-offset-2"
          >
            Ver todas as {structuredAmenities.length} comodidades
          </button>
        )}

        {showAll && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowAll(false)} />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-6 max-h-[80vh] overflow-y-auto sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-lodgra-neutral-900">Todas as comodidades</h3>
                <button onClick={() => setShowAll(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-600" aria-label="Fechar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {Object.entries(categorised).map(([cat, items]) => (
                <div key={cat} className="mb-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-lodgra-neutral-500 mb-3">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    {items.map(a => (
                      <div key={a.id} className="flex items-center gap-2 text-sm text-lodgra-neutral-700">
                        <DynamicIcon name={a.icon} className="h-4 w-4 text-lodgra-brand-500 shrink-0" />
                        {a.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    )
  }

  // ── Legacy (properties.amenities string array) ─────────────────────────────
  if (!amenities || amenities.length === 0) return null

  const mapped = amenities.map(key => ({
    key,
    ...(AMENITY_MAP[key] ?? {
      icon: AirVent,
      label: key.replace(/_/g, ' '),
      category: 'Outros',
    }),
  }))

  const preview = mapped.slice(0, PREVIEW_COUNT)

  return (
    <section aria-label="Comodidades">
      <h2 className="text-xl font-semibold text-lodgra-neutral-900 mb-4">Comodidades</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {preview.map(({ key, icon: Icon, label }) => (
          <div key={key} className="flex items-center gap-2.5 text-sm text-lodgra-neutral-700">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lodgra-brand-50 shrink-0">
              <Icon className="h-4 w-4 text-lodgra-brand-500" />
            </span>
            {label}
          </div>
        ))}
      </div>

      {mapped.length > PREVIEW_COUNT && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-4 text-sm font-semibold text-lodgra-brand-600 hover:text-lodgra-brand-500 underline underline-offset-2"
        >
          Ver todas as {mapped.length} comodidades
        </button>
      )}

      {showAll && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowAll(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-6 max-h-[80vh] overflow-y-auto sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-lodgra-neutral-900">Todas as comodidades</h3>
              <button onClick={() => setShowAll(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-600" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            {(['Essenciais', 'Cozinha', 'Exterior', 'Extra', 'Outros'] as const).map(cat => {
              const group = mapped.filter(a => a.category === cat)
              if (!group.length) return null
              return (
                <div key={cat} className="mb-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-lodgra-neutral-500 mb-3">{cat}</h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    {group.map(({ key, icon: Icon, label }) => (
                      <div key={key} className="flex items-center gap-2 text-sm text-lodgra-neutral-700">
                        <Icon className="h-4 w-4 text-lodgra-brand-500 shrink-0" />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
