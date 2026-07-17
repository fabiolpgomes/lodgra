import { BedDouble, BedSingle, Sofa } from 'lucide-react'

export interface PropertyRoom {
  id: string
  name: string | null
  bed_type: string
  bed_count: number
  provides_linen: boolean
}

interface PropertyRoomsProps {
  rooms: PropertyRoom[]
}

const BED_TYPE_LABELS: Record<string, string> = {
  single: 'Cama Solteiro',
  double: 'Cama Casal',
  queen: 'Cama Queen',
  king: 'Cama King',
  sofa_bed: 'Sofá-cama',
  bunk: 'Beliches',
}

function BedIcon({ bedType }: { bedType: string }) {
  if (bedType === 'single' || bedType === 'bunk') return <BedSingle className="h-4 w-4 text-be-text-600" />
  if (bedType === 'sofa_bed') return <Sofa className="h-4 w-4 text-be-text-600" />
  return <BedDouble className="h-4 w-4 text-be-text-600" />
}

export function PropertyRooms({ rooms }: PropertyRoomsProps) {
  if (!rooms || rooms.length === 0) return null

  return (
    <section className="py-6 border-t border-lodgra-border-subtle">
      <h2 className="text-xl font-semibold text-be-text mb-5">Quartos</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {rooms.map((room) => {
          const bedLabel = BED_TYPE_LABELS[room.bed_type] ?? room.bed_type
          const title = room.name || `Quarto ${rooms.indexOf(room) + 1}`
          return (
            <div
              key={room.id}
              className="rounded-xl border border-lodgra-border-subtle bg-lodgra-neutral-50 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <BedIcon bedType={room.bed_type} />
                <span className="text-sm font-semibold text-be-text">{title}</span>
              </div>
              <p className="text-sm text-be-text-muted">
                {room.bed_count}× {bedLabel}
                {room.provides_linen && (
                  <span className="ml-2 text-xs text-be-text-muted-500">· Roupa de cama incluída</span>
                )}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
