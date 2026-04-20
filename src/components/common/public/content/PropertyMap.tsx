'use client'

interface PropertyMapProps {
  address: string
  city: string
  country: string
}

export function PropertyMap({ address, city, country }: PropertyMapProps) {
  const query = encodeURIComponent([address, city, country].filter(Boolean).join(', '))

  return (
    <div className="rounded-xl overflow-hidden h-80 border border-neutral-200">
      <iframe
        title="Localização da propriedade"
        src={`https://maps.google.com/maps?q=${query}&output=embed&z=15&hl=pt`}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}
