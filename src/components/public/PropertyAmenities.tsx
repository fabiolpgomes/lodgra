import {
  Wifi, Tv, Car, Wind, Waves, UtensilsCrossed, WashingMachine,
  Dumbbell, Trees, ThermometerSun, Flame, Baby, PawPrint, Coffee,
  ShowerHead, Lock, Layers, Armchair, CheckCircle2,
} from 'lucide-react'

const AMENITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  'wi-fi': Wifi,
  tv: Tv,
  televisão: Tv,
  estacionamento: Car,
  parking: Car,
  garagem: Car,
  'ar condicionado': Wind,
  piscina: Waves,
  cozinha: UtensilsCrossed,
  'cozinha equipada': UtensilsCrossed,
  'máquina de lavar': WashingMachine,
  ginásio: Dumbbell,
  jardim: Trees,
  terraço: Layers,
  'terraço/varanda': Layers,
  varanda: Layers,
  aquecimento: ThermometerSun,
  lareira: Flame,
  'berço/cama criança': Baby,
  animais: PawPrint,
  'máquina de café': Coffee,
  duche: ShowerHead,
  cofre: Lock,
  'sofá-cama': Armchair,
}

interface PropertyAmenitiesProps {
  amenities: string[]
}

export function PropertyAmenities({ amenities }: PropertyAmenitiesProps) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {amenities.map((amenity) => {
        const key = amenity.toLowerCase()
        const Icon = AMENITY_ICONS[key] ?? CheckCircle2
        return (
          <li key={amenity} className="flex items-center gap-2 text-sm text-gray-700">
            <Icon className="h-4 w-4 text-gray-400 shrink-0" />
            <span>{amenity}</span>
          </li>
        )
      })}
    </ul>
  )
}
