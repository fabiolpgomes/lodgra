'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import '@/styles/calendar-kanban.css'

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

const DAYS_SHORT = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

interface Reservation {
  id: string
  guestName: string
  startDate: Date
  endDate: Date
  price: number
}

interface Property {
  id: string
  name: string
  type: string
  location: string
  imageUrl?: string
}

// Mock data
const mockProperty: Property = {
  id: 'prop-1',
  name: 'AHS Studio Premium Bela Vista',
  type: 'Studio',
  location: 'Bela Vista',
  imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160"%3E%3Crect fill="%23e0e0e0" width="160" height="160"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EStudio%3C/text%3E%3C/svg%3E',
}

const mockReservations: Reservation[] = [
  {
    id: 'res-1',
    guestName: 'Juliana',
    startDate: new Date(2026, 6, 1),
    endDate: new Date(2026, 6, 5),
    price: 103,
  },
  {
    id: 'res-2',
    guestName: 'Cleme',
    startDate: new Date(2026, 6, 8),
    endDate: new Date(2026, 6, 12),
    price: 103,
  },
]

// Helper function to generate calendar days grid
function generateDaysGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const daysGrid: (number | null)[] = []

  for (let i = 0; i < startingDayOfWeek; i++) {
    daysGrid.push(null)
  }

  for (let i = 1; i <= daysInMonth; i++) {
    daysGrid.push(i)
  }

  return daysGrid
}

// Mini calendar component for year view
function MiniCalendar({ year, month }: { year: number; month: number }) {
  const daysGrid = generateDaysGrid(year, month)
  const monthName = MONTHS[month]

  return (
    <div
      style={{
        background: '#ffffff',
        border: '2px solid #1b2430',
        borderRadius: '12px',
        padding: '16px',
        minWidth: '300px',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#1b2430', textAlign: 'center', textTransform: 'capitalize' }}>
        {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
        }}
      >
        {/* Day headers */}
        {DAYS_SHORT.map(day => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: '600',
              color: '#4d5566',
              padding: '4px 0',
            }}
          >
            {day}
          </div>
        ))}

        {/* Days */}
        {daysGrid.map((day, idx) => (
          <div
            key={idx}
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: day ? '#fbfaf6' : 'transparent',
              fontSize: '12px',
              fontWeight: day ? '600' : '400',
              color: '#1b2430',
              borderRadius: '4px',
            }}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PropertyCalendarPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'pt-BR'

  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1))
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')

  const year = currentDate.getFullYear()
  const monthIndex = currentDate.getMonth()
  const monthDisplay = MONTHS[monthIndex]
  const daysGrid = generateDaysGrid(year, monthIndex)

  // Config state
  const [editingConfig, setEditingConfig] = useState<'preco' | 'desconto' | 'disponibilidade' | 'cancelamentos' | null>(null)
  const [smartPriceEnabled, setSmartPriceEnabled] = useState(false)
  const [priceMin, setPriceMin] = useState(80)
  const [priceMax, setPriceMax] = useState(190)
  const [discountSemanal, setDiscountSemanal] = useState(10) // 7+ dias
  const [discountMensal, setDiscountMensal] = useState(20) // 28+ dias
  const [minStay, setMinStay] = useState(3)
  const [maxStay, setMaxStay] = useState(90)
  const [availabilityPeriod, setAvailabilityPeriod] = useState(6) // 6, 12, 18 meses
  const [noticeDay, setNoticeDay] = useState(1)
  const [cancellationPolicy, setCancellationPolicy] = useState('flexible')

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#fbfaf6' }}>
      {/* Left Sidebar - Navigation */}
      <div
        style={{
          width: '120px',
          borderRight: '1px solid #efeadf',
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <button
          onClick={() => router.push(`/${locale}/calendar`)}
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '8px',
            borderRadius: '8px',
            background: '#eee',
            fontSize: '12px',
            border: 'none',
            textDecoration: 'none',
            color: '#1b2430',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          ← Voltar
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header com Controls */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #efeadf',
            background: '#fbfaf6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: '#1b2430' }}>
              {viewMode === 'year' ? year : (monthDisplay.charAt(0).toUpperCase() + monthDisplay.slice(1))}
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#4d5566' }}>
              {mockProperty.name}
            </p>
          </div>

          {/* Month Selector, Navigation Buttons, and View Toggle */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {viewMode === 'month' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(newDate.getMonth() - 1)
                    setCurrentDate(newDate)
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    border: '1px solid #efeadf',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1b2430',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f7f5ef'
                    e.currentTarget.style.borderColor = '#cfc4aa'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff'
                    e.currentTarget.style.borderColor = '#efeadf'
                  }}
                >
                  ←
                </button>

                <select
                  value={currentDate.getMonth()}
                  onChange={(e) => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(parseInt(e.target.value))
                    setCurrentDate(newDate)
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #efeadf',
                    background: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1b2430',
                    cursor: 'pointer',
                    minWidth: '160px',
                  }}
                >
                  {MONTHS.map((month, idx) => (
                    <option key={idx} value={idx}>
                      {month.charAt(0).toUpperCase() + month.slice(1)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(newDate.getMonth() + 1)
                    setCurrentDate(newDate)
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    border: '1px solid #efeadf',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1b2430',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f7f5ef'
                    e.currentTarget.style.borderColor = '#cfc4aa'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff'
                    e.currentTarget.style.borderColor = '#efeadf'
                  }}
                >
                  →
                </button>
              </div>
            )}

            {viewMode === 'year' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(newDate.getMonth() - 3)
                    setCurrentDate(newDate)
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    border: '1px solid #efeadf',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1b2430',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f7f5ef'
                    e.currentTarget.style.borderColor = '#cfc4aa'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff'
                    e.currentTarget.style.borderColor = '#efeadf'
                  }}
                >
                  ←
                </button>
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(newDate.getMonth() + 3)
                    setCurrentDate(newDate)
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    border: '1px solid #efeadf',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1b2430',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f7f5ef'
                    e.currentTarget.style.borderColor = '#cfc4aa'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff'
                    e.currentTarget.style.borderColor = '#efeadf'
                  }}
                >
                  →
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '4px', border: '1px solid #efeadf', borderRadius: '8px' }}>
              <button
                onClick={() => setViewMode('month')}
                style={{
                  padding: '8px 12px',
                  background: viewMode === 'month' ? '#1b2430' : '#ffffff',
                  color: viewMode === 'month' ? '#ffffff' : '#1b2430',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderRadius: '6px 0 0 6px',
                }}
              >
                Mês
              </button>
              <button
                onClick={() => setViewMode('year')}
                style={{
                  padding: '8px 12px',
                  background: viewMode === 'year' ? '#1b2430' : '#ffffff',
                  color: viewMode === 'year' ? '#ffffff' : '#1b2430',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderRadius: '0 6px 6px 0',
                }}
              >
                Ano
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          {viewMode === 'month' ? (
            // Month View
            <div style={{ maxWidth: '900px' }}>
              {/* Day headers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '16px',
                  marginBottom: '24px',
                }}
              >
                {['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'].map(day => (
                  <div
                    key={day}
                    style={{
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#4d5566',
                      textTransform: 'capitalize',
                      textDecoration: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '16px',
                  autoRows: '120px',
                }}
              >
                {daysGrid.map((day, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #efeadf',
                      borderRadius: '12px',
                      padding: '16px',
                      background: day ? '#ffffff' : '#fbfaf6',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: day ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (day) e.currentTarget.style.background = '#f7f5ef'
                    }}
                    onMouseLeave={(e) => {
                      if (day) e.currentTarget.style.background = '#ffffff'
                    }}
                  >
                    {day && (
                      <>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#1b2430' }}>
                          {day}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1b2430' }}>
                          € 145
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Year View - 3 months per row with vertical scroll
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                minHeight: '100%',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '24px',
                  maxWidth: '1100px',
                  width: '100%',
                  paddingBottom: '40px',
                }}
              >
                {[0, 1, 2].map(offset => {
                  const m = (monthIndex + offset) % 12
                  const y = offset === 0 && m > monthIndex ? year - 1 : year
                  return <MiniCalendar key={`${y}-${m}`} year={y} month={m} />
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Configuration */}
      <div
        style={{
          width: '340px',
          borderLeft: '1px solid #efeadf',
          padding: '24px',
          overflowY: 'auto',
          background: '#fbfaf6',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}
      >
        <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#1b2430' }}>
          Configuração
        </h3>

        {/* Config cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            {
              id: 'preco' as const,
              label: 'Preços',
              value: smartPriceEnabled
                ? `Preço Inteligente ativado\n${priceMin} € – ${priceMax} € por noite`
                : `${priceMin} € – ${priceMax} € por noite`
            },
            {
              id: 'desconto' as const,
              label: 'Descontos',
              value: `Semanal: ${discountSemanal}%\nMensal: ${discountMensal}%`
            },
            {
              id: 'disponibilidade' as const,
              label: 'Disponibilidade',
              value: `Estadias de ${minStay} a ${maxStay} noites\nPeríodo: ${availabilityPeriod} meses`,
            },
            {
              id: 'cancelamentos' as const,
              label: 'Cancelamentos',
              value: cancellationPolicy === 'flexible'
                ? 'Flexível\nReembolso até 1 dia antes'
                : cancellationPolicy === 'moderate'
                ? 'Moderada\nReembolso até 5 dias antes'
                : cancellationPolicy === 'limited'
                ? 'Limitada\nReembolso até 14 dias antes'
                : 'Firme\nReembolso até 30 dias antes',
            },
          ].map((item) => (
            <div
              key={item.id}
              style={{
                background: '#ffffff',
                border: '1px solid #efeadf',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setEditingConfig(item.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f7f5ef'
                e.currentTarget.style.borderColor = '#cfc4aa'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff'
                e.currentTarget.style.borderColor = '#efeadf'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '700', color: '#1b2430' }}>
                    {item.label}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#4d5566',
                      whiteSpace: 'pre-line',
                      lineHeight: '1.5',
                    }}
                  >
                    {item.value}
                  </p>
                </div>
                <span style={{ color: '#1b2430', fontSize: '16px', marginTop: '0px', flexShrink: 0, fontWeight: '600' }}>
                  →
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Modal - Preços */}
        {editingConfig === 'preco' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setEditingConfig(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '450px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#1b2430' }}>
                Editar Preços
              </h3>

              {/* Preço Inteligente Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: '#fbfaf6',
                  borderRadius: '12px',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1b2430', marginBottom: '4px' }}>
                    Preço Inteligente
                  </div>
                  <div style={{ fontSize: '12px', color: '#4d5566' }}>
                    Ajusta automaticamente baseado em demanda
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={smartPriceEnabled}
                  onChange={(e) => setSmartPriceEnabled(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                    Preço Mínimo (€)
                  </label>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(parseInt(e.target.value))}
                    disabled={smartPriceEnabled}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      opacity: smartPriceEnabled ? 0.6 : 1,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                    Preço Máximo (€)
                  </label>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(parseInt(e.target.value))}
                    disabled={smartPriceEnabled}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      opacity: smartPriceEnabled ? 0.6 : 1,
                    }}
                  />
                </div>

                {smartPriceEnabled && (
                  <div
                    style={{
                      padding: '12px',
                      background: '#e8f0fe',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#1b2430',
                      borderLeft: '4px solid #1b2430',
                    }}
                  >
                    ℹ️ Preço inteligente usa automaticamente o preço mínimo em baixa demanda e máximo em alta demanda.
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#f7f5ef',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1b2430',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#1b2430',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff',
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal - Descontos */}
        {editingConfig === 'desconto' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setEditingConfig(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '450px',
                width: '90%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#1b2430' }}>
                Editar Descontos
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    padding: '16px',
                    background: '#fbfaf6',
                    borderRadius: '12px',
                  }}
                >
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                    Desconto Semanal (7+ dias)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="number"
                      value={discountSemanal}
                      onChange={(e) => setDiscountSemanal(parseInt(e.target.value))}
                      min="0"
                      max="100"
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: '1px solid #efeadf',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#1b2430', minWidth: '30px' }}>
                      %
                    </span>
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#4d5566' }}>
                    Aplicado automaticamente para reservas de 7 ou mais noites
                  </p>
                </div>

                <div
                  style={{
                    padding: '16px',
                    background: '#f7f5ef',
                    borderRadius: '12px',
                  }}
                >
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                    Desconto Mensal (28+ dias)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="number"
                      value={discountMensal}
                      onChange={(e) => setDiscountMensal(parseInt(e.target.value))}
                      min="0"
                      max="100"
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: '1px solid #efeadf',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#1b2430', minWidth: '30px' }}>
                      %
                    </span>
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#4d5566' }}>
                    Aplicado automaticamente para reservas de 28 ou mais noites
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#f7f5ef',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1b2430',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#1b2430',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff',
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal - Disponibilidade */}
        {editingConfig === 'disponibilidade' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setEditingConfig(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '450px',
                width: '90%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#1b2430' }}>
                Editar Disponibilidade
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                    Estadia Mínima (noites)
                  </label>
                  <input
                    type="number"
                    value={minStay}
                    onChange={(e) => setMinStay(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#4d5566' }}>
                    Número mínimo de noites para reserva
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                    Estadia Máxima (noites)
                  </label>
                  <input
                    type="number"
                    value={maxStay}
                    onChange={(e) => setMaxStay(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#4d5566' }}>
                    Número máximo de noites permitidas
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                    Período de Disponibilidade
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[6, 12, 18].map(months => (
                      <button
                        key={months}
                        onClick={() => setAvailabilityPeriod(months)}
                        style={{
                          padding: '12px',
                          border: availabilityPeriod === months ? '2px solid #1b2430' : '1px solid #efeadf',
                          borderRadius: '8px',
                          background: availabilityPeriod === months ? '#f7f5ef' : '#ffffff',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1b2430',
                          transition: 'all 0.2s',
                        }}
                      >
                        {months}m
                      </button>
                    ))}
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#4d5566' }}>
                    Dias após esse período serão bloqueados automaticamente
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#f7f5ef',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1b2430',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#1b2430',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff',
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal - Cancelamentos */}
        {editingConfig === 'cancelamentos' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setEditingConfig(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#1b2430' }}>
                Política de Cancelamento
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  {
                    value: 'flexible',
                    label: 'Flexível',
                    terms: 'Reembolso integral até 1 dia antes do check-in',
                    details: 'Reembolso parcial no prazo de um dia após o check-in. Aos hóspedes que cancelem menos de um dia antes do check-in, é cobrada uma noite. Se os hóspedes cancelarem durante a estadia, é cobrada uma noite extra e o restante é reembolsado.',
                  },
                  {
                    value: 'moderate',
                    label: 'Moderada',
                    terms: 'Reembolso integral até 5 dias antes do check-in',
                    details: 'Reembolso parcial no prazo de 5 dias após o check-in. Se os hóspedes cancelarem quando faltarem menos de 5 dias para o check-in ou durante a estadia, é-lhes cobrada uma noite extra e recebem um reembolso de 50% do valor das noites não usufruídas.',
                  },
                  {
                    value: 'limited',
                    label: 'Limitada',
                    terms: 'Reembolso integral até 14 dias antes do check-in',
                    details: 'Reembolso parcial 7 a 14 dias antes do check-in. Os hóspedes que cancelarem 7 a 14 dias antes do check-in recebem um reembolso de 50% do total. Após este período, a estadia não é reembolsável.',
                  },
                  {
                    value: 'strict',
                    label: 'Firme',
                    terms: 'Reembolso total pelo menos 30 dias antes do check-in',
                    details: 'Reembolso parcial 7 a 30 dias antes do check-in. Se os hóspedes cancelarem 7 a 30 dias antes do check-in, recebem 50% de reembolso. Após este prazo, a estadia não é reembolsável.',
                  },
                ].map(policy => (
                  <div
                    key={policy.value}
                    onClick={() => setCancellationPolicy(policy.value as any)}
                    style={{
                      padding: '16px',
                      border: cancellationPolicy === policy.value ? '2px solid #1b2430' : '1px solid #efeadf',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: cancellationPolicy === policy.value ? '#f7f5ef' : '#ffffff',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1b2430', marginBottom: '6px' }}>
                      {policy.label}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#4d5566', marginBottom: '8px' }}>
                      {policy.terms}
                    </div>
                    <div style={{ fontSize: '11px', color: '#7c8492', lineHeight: '1.5' }}>
                      {policy.details}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#f7f5ef',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1b2430',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#1b2430',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff',
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
