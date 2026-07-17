import { Bath, Droplets } from 'lucide-react'

export interface PropertyBathroom {
  id: string
  name: string | null
  bathroom_type: string
  amenities: string[]
}

interface PropertyBathroomsProps {
  bathrooms: PropertyBathroom[]
}

const BATHROOM_TYPE_LABELS: Record<string, string> = {
  wc: 'WC',
  full: 'Banheiro completo',
}

function BathroomTypeIcon({ type }: { type: string }) {
  if (type === 'wc') return <Droplets className="h-4 w-4 text-be-text-600" />
  return <Bath className="h-4 w-4 text-be-text-600" />
}

export function PropertyBathrooms({ bathrooms }: PropertyBathroomsProps) {
  if (!bathrooms || bathrooms.length === 0) return null

  return (
    <section className="py-6 border-t border-lodgra-border-subtle">
      <h2 className="text-xl font-semibold text-be-text mb-5">Casas de banho</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {bathrooms.map((bathroom, index) => {
          const typeLabel = BATHROOM_TYPE_LABELS[bathroom.bathroom_type] ?? bathroom.bathroom_type
          const title = bathroom.name || `Casa de banho ${index + 1}`
          return (
            <div
              key={bathroom.id}
              className="rounded-xl border border-lodgra-border-subtle bg-lodgra-neutral-50 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <BathroomTypeIcon type={bathroom.bathroom_type} />
                <span className="text-sm font-semibold text-be-text">{title}</span>
              </div>
              <p className="text-sm text-be-text-muted">{typeLabel}</p>
              {bathroom.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {bathroom.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="text-xs bg-white border border-lodgra-border-subtle rounded-full px-2 py-0.5 text-be-text-muted"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
