/**
 * Fallback Open Graph image when property is not found
 * Dimensions: 1200×630px
 */
export function FallbackImage() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', color: '#ffffff' }}>
        <div style={{ fontSize: '64px', fontWeight: 700, marginBottom: '16px' }}>🏠</div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '48px', fontWeight: 700 }}>Lodgra</h1>
        <p style={{ margin: 0, fontSize: '20px', opacity: 0.9 }}>Reserva Directa de Propriedades</p>
      </div>
    </div>
  )
}
