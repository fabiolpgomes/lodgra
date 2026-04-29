import { ImageResponse } from 'next/og'

export const alt = 'Lodgra - App de Gestão de Aluguel por Temporada'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: '#1e3a5f',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        {/* Nome do produto */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '32px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: '16px',
            padding: '16px 32px',
          }}
        >
          <span
            style={{
              fontSize: '44px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-1px',
            }}
          >
            Lodgra
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            fontSize: '46px',
            fontWeight: 800,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.2,
            marginBottom: '20px',
            maxWidth: '900px',
          }}
        >
          App de Gestão de Aluguel por Temporada
        </div>

        {/* Subtítulo */}
        <div
          style={{
            display: 'flex',
            fontSize: '24px',
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'center',
            marginBottom: '48px',
            maxWidth: '800px',
          }}
        >
          Airbnb + Booking + Canal Direto num só lugar
        </div>

        {/* Preços */}
        <div style={{ display: 'flex', gap: '24px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '16px 32px',
            }}
          >
            <span style={{ display: 'flex', fontSize: '34px', fontWeight: 800, color: '#ffffff' }}>
              EUR 9,90
            </span>
            <span style={{ display: 'flex', fontSize: '16px', color: 'rgba(255,255,255,0.8)' }}>
              /imóvel/mês - Portugal
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '16px 32px',
            }}
          >
            <span style={{ display: 'flex', fontSize: '34px', fontWeight: 800, color: '#ffffff' }}>
              R$ 29,90
            </span>
            <span style={{ display: 'flex', fontSize: '16px', color: 'rgba(255,255,255,0.8)' }}>
              /imóvel/mês - Brasil
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
