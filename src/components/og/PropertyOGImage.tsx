import { PropertyForOG } from '@/lib/supabase/properties'

interface PropertyOGImageProps {
  property: PropertyForOG
}

/**
 * Dynamic Open Graph image component for property listings
 * Dimensions: 1200×630px (standard OG image size)
 * Used by: src/app/p/[slug]/opengraph-image.tsx
 */
export function PropertyOGImage({ property }: PropertyOGImageProps) {
  const photoUrl = property.photo_url

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Photo background (70% left) */}
      <div
        style={{
          width: '70%',
          height: '100%',
          backgroundImage: photoUrl ? `url(${photoUrl})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        {/* Overlay gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to right, rgba(0,0,0,0.4), rgba(0,0,0,0.1))',
          }}
        />
      </div>

      {/* Content (30% right) */}
      <div
        style={{
          width: '30%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px 30px',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Title & Location */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              color: '#1a1a1a',
              lineHeight: '1.2',
              maxHeight: '84px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {property.name}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '16px',
              color: '#666666',
              fontWeight: 500,
            }}
          >
            📍 {property.location}
          </p>
        </div>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '32px', fontWeight: 700, color: '#000000' }}>
            {property.base_price}
          </span>
          <span style={{ fontSize: '14px', color: '#666666', fontWeight: 500 }}>
            {property.currency}/noite
          </span>
        </div>

        {/* Footer: Lodgra branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#999999',
            borderTop: '1px solid #eeeeee',
            paddingTop: '12px',
          }}
        >
          <div style={{ fontWeight: 600 }}>Lodgra</div>
          <span>•</span>
          <span>Reserva Directa</span>
        </div>
      </div>
    </div>
  )
}
