'use client'

import { useState, useEffect } from 'react'
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

// Default property data
const defaultProperty: Property = {
  id: '',
  name: 'Carregando...',
  type: 'Property',
  location: '',
  imageUrl: '',
}

const defaultReservations: Reservation[] = []

// Color palette for different guests (Airbnb-style)
const GUEST_COLORS = [
  '#1a7a85', // Teal (primary)
  '#2B8C99', // Teal lighter
  '#367F8E', // Teal medium
  '#1F6B7A', // Teal darker
  '#2D95A8', // Teal bright
]

// Generate consistent color for guest based on name hash
const getGuestColor = (guestName: string, reservationId: string): string => {
  const hash = (guestName + reservationId).split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  return GUEST_COLORS[hash % GUEST_COLORS.length]
}

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
  const [isMobile, setIsMobile] = useState(false)
  const [property, setProperty] = useState<Property>(defaultProperty)
  const [reservations, setReservations] = useState<Reservation[]>(defaultReservations)

  // Fetch property and reservations on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propsRes, reservRes] = await Promise.all([
          fetch(`/api/properties/${params.propertyId}`),
          fetch('/api/calendar/reservations'),
        ])

        if (propsRes.ok) {
          const propsData = await propsRes.json()
          const prop = propsData.data || propsData
          setProperty({
            id: prop.id,
            name: prop.name,
            type: prop.bedrooms ? `${prop.bedrooms} dorms` : 'Property',
            location: prop.city || prop.country || '',
            imageUrl: prop.image,
          })
        }

        if (reservRes.ok) {
          const data = await reservRes.json()
          const events = Array.isArray(data) ? data : (data.data || [])
          const mapped = events
            .filter((evt: any) => evt.extendedProps?.property_id === params.propertyId)
            .map((evt: any) => ({
              id: evt.id,
              propertyId: evt.extendedProps?.property_id || '',
              guestName: evt.extendedProps?.guest_name || 'Hóspede',
              guestCount: evt.extendedProps?.number_of_guests || 1,
              startDate: new Date(evt.start),
              endDate: new Date(evt.end),
              price: 0,
              status: evt.extendedProps?.status || 'confirmed',
            }))
          setReservations(mapped)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setProperty(defaultProperty)
        setReservations(defaultReservations)
      }
    }
    fetchData()
  }, [params.propertyId])

  // Detect mobile on mount
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const year = currentDate.getFullYear()
  const monthIndex = currentDate.getMonth()
  const monthDisplay = MONTHS[monthIndex]
  const daysGrid = generateDaysGrid(year, monthIndex)

  // Config state
  const [editingConfig, setEditingConfig] = useState<'preco' | 'desconto' | 'disponibilidade' | 'cancelamentos' | null>(null)
  const [configTab, setConfigTab] = useState<'precos' | 'descontos' | 'disponibilidade'>('precos')
  const [smartPriceEnabled, setSmartPriceEnabled] = useState(false)
  const [priceMin, setPriceMin] = useState(80)
  const [priceMax, setPriceMax] = useState(190)
  const [discountSemanal, setDiscountSemanal] = useState(10)
  const [discountMensal, setDiscountMensal] = useState(20)
  const [minStay, setMinStay] = useState(3)
  const [maxStay, setMaxStay] = useState(90)
  const [availabilityPeriod, setAvailabilityPeriod] = useState(6)
  const [noticeDay, setNoticeDay] = useState(1)
  const [cancellationPolicy, setCancellationPolicy] = useState('flexible')

  // Mobile calendar view with prices
  if (isMobile) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fbfaf6' }}>
        {/* Mobile Header - Airbnb style */}
        <div style={{ padding: '12px 16px', background: '#ffffff', borderBottom: '1px solid #efeadf', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <button
            onClick={() => router.push(`/${locale}/calendar`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#1b2430', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ←
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1b2430', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {property.name.substring(0, 30)}
            </h1>
          </div>
          <button
            onClick={() => {}}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#1b2430', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            📅
          </button>
          <button
            onClick={() => setEditingConfig('preco')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#1b2430', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ⚙️
          </button>
        </div>

        {/* Mobile Calendar with prices */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ marginBottom: '24px' }}>
            {/* Month/Year navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
              <button
                onClick={() => setCurrentDate(new Date(year, monthIndex - 1, 1))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#1b2430', padding: '8px' }}
              >
                ←
              </button>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1b2430', textTransform: 'capitalize', flex: 1, textAlign: 'center' }}>
                {monthDisplay} {year}
              </h2>
              <button
                onClick={() => setCurrentDate(new Date(year, monthIndex + 1, 1))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#1b2430', padding: '8px' }}
              >
                →
              </button>
            </div>

            {/* Days of week */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '8px' }}>
              {DAYS_SHORT.map(day => (
                <div key={day} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#4d5566', textTransform: 'uppercase' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid with prices */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {daysGrid.map((day, idx) => {
                const isReserved = reservations.some(
                  res =>
                    day &&
                    new Date(res.startDate) <= new Date(year, monthIndex, day) &&
                    new Date(res.endDate) > new Date(year, monthIndex, day)
                )
                const dayPrice = day ? (day % 2 === 0 ? 149 : 157) : null

                return (
                  <div
                    key={idx}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: day ? '#ffffff' : '#f7f5ef',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      fontSize: day ? '12px' : '11px',
                      fontWeight: '600',
                      color: '#1b2430',
                      cursor: day ? 'pointer' : 'default',
                      padding: '4px',
                      textAlign: 'center',
                    }}
                  >
                    {day && (
                      <>
                        <div style={{ fontSize: '13px', fontWeight: '700' }}>{day}</div>
                        {dayPrice && (
                          <div style={{ fontSize: '10px', color: '#4d5566', marginTop: '2px' }}>
                            R${dayPrice}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Reservations summary - Airbnb style */}
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#1b2430' }}>
              Reservas ({reservations.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {reservations.map(res => {
                const guestColor = getGuestColor(res.guestName, res.id)
                const startDate = new Date(res.startDate)
                const endDate = new Date(res.endDate)
                const today = new Date()
                today.setHours(0, 0, 0, 0)

                let status = 'Confirmado'
                if (today >= startDate && today < endDate) {
                  status = 'Hospedando'
                }

                return (
                  <div
                    key={res.id}
                    style={{
                      padding: '10px 14px',
                      background: guestColor,
                      border: 'none',
                      borderRadius: '20px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {/* Guest name */}
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                      {res.guestName}
                    </div>

                    {/* Date range */}
                    <div style={{ whiteSpace: 'nowrap', fontSize: '11px', opacity: 0.9 }}>
                      {startDate.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                    </div>

                    {/* Status */}
                    <div style={{ whiteSpace: 'nowrap', fontSize: '10px', opacity: 0.85 }}>
                      {status}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mobile Config Modal - with tabs */}
        {editingConfig === 'preco' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1000,
            }}
            onClick={() => setEditingConfig(null)}
          >
            <div
              style={{
                marginTop: 'auto',
                background: '#ffffff',
                borderRadius: '24px 24px 0 0',
                padding: '20px',
                maxHeight: '85vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button
                  onClick={() => setEditingConfig(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#1b2430' }}
                >
                  ✕
                </button>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1b2430' }}>Configurações</h2>
                <div style={{ width: '24px' }} />
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #efeadf', paddingBottom: '12px' }}>
                {['precos', 'descontos', 'disponibilidade'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setConfigTab(tab as any)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: configTab === tab ? '3px solid #1b2430' : 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: configTab === tab ? '#1b2430' : '#4d5566',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div>
                {/* Preços Tab */}
                {configTab === 'precos' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Preço básico
                      </label>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#1b2430' }}>R$ {priceMin}</div>
                    </div>

                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Preço de fim de semana
                      </label>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#1b2430' }}>R$ {priceMax}</div>
                        <button style={{ background: 'none', border: 'none', color: '#1b2430', cursor: 'pointer', fontWeight: '600', fontSize: '13px', textDecoration: 'underline' }}>
                          Remover
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1b2430', marginBottom: '4px' }}>Preço Inteligente</div>
                        <div style={{ fontSize: '11px', color: '#4d5566' }}>Ajusta automaticamente</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={smartPriceEnabled}
                        onChange={(e) => setSmartPriceEnabled(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                )}

                {/* Descontos Tab */}
                {configTab === 'descontos' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Por semana
                      </label>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1b2430', marginBottom: '4px' }}>{discountSemanal}%</div>
                      <div style={{ fontSize: '11px', color: '#4d5566' }}>A média semanal é de R$ 1.059</div>
                    </div>

                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Por mês
                      </label>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1b2430', marginBottom: '4px' }}>{discountMensal}%</div>
                      <div style={{ fontSize: '11px', color: '#4d5566' }}>A média mensal é de R$ 4.307</div>
                    </div>
                  </div>
                )}

                {/* Disponibilidade Tab */}
                {configTab === 'disponibilidade' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Número mínimo de noites
                      </label>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1b2430' }}>{minStay}</div>
                    </div>

                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Número máximo de noites
                      </label>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1b2430' }}>{maxStay}</div>
                    </div>

                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Tempo de antecedência
                      </label>
                      <div style={{ fontSize: '14px', color: '#1b2430' }}>Mesmo dia</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer padding */}
              <div style={{ height: '16px' }} />
            </div>
          </div>
        )}
      </div>
    )
  }

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
              {property.name}
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
                  gridAutoRows: '120px',
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
