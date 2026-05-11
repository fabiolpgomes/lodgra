import type { ReviewScoreData, ReviewSource } from '@/types/database'

const SOURCE_LABELS: Record<ReviewSource, string> = {
  booking: 'Booking.com',
  airbnb: 'Airbnb',
  google: 'Google',
  tripadvisor: 'TripAdvisor',
  direct: 'Reserva Direta',
  other: 'Outra',
}

// Cor do badge por plataforma
const SOURCE_COLORS: Record<ReviewSource, string> = {
  booking: 'bg-blue-50 text-blue-700',
  airbnb: 'bg-rose-50 text-rose-600',
  google: 'bg-amber-50 text-amber-700',
  tripadvisor: 'bg-green-50 text-green-700',
  direct: 'bg-lodgra-brand-50 text-lodgra-brand-700',
  other: 'bg-neutral-100 text-neutral-600',
}

function qualityLabel(avg: number): { text: string; color: string } | null {
  if (avg >= 9.5) return { text: 'Excepcional', color: 'text-emerald-600' }
  if (avg >= 9)   return { text: 'Excelente',   color: 'text-emerald-600' }
  if (avg >= 8)   return { text: 'Muito Bom',   color: 'text-blue-600' }
  if (avg >= 7)   return { text: 'Bom',         color: 'text-blue-500' }
  if (avg >= 6)   return { text: 'Satisfatório', color: 'text-neutral-600' }
  return null
}

interface PropertyReviewScoreProps {
  reviewScore?: ReviewScoreData | null
}

export function PropertyReviewScore({ reviewScore }: PropertyReviewScoreProps) {
  if (!reviewScore || reviewScore.totalCount === 0) return null

  const label = qualityLabel(reviewScore.globalAvg)

  return (
    <section className="border-t border-neutral-200 pt-8">
      <h2 className="text-xl font-semibold text-neutral-900 mb-6">Avaliações</h2>

      {/* Score global */}
      <div className="flex items-center gap-5 mb-6">
        <div className="flex items-end gap-1.5 leading-none">
          <span className="text-6xl font-extrabold text-lodgra-brand-700 leading-none">
            {reviewScore.globalAvg.toFixed(1)}
          </span>
          <span className="text-xl text-neutral-400 mb-1">/10</span>
        </div>
        <div className="flex flex-col gap-1">
          {label && (
            <p className={`text-lg font-bold ${label.color}`}>{label.text}</p>
          )}
          <p className="text-sm text-neutral-500">
            Baseado em {reviewScore.totalCount}{' '}
            {reviewScore.totalCount === 1 ? 'avaliação' : 'avaliações'}
          </p>
        </div>
      </div>

      {/* Score por OTA — escala nativa de cada plataforma */}
      {reviewScore.bySource.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {reviewScore.bySource.map(({ source, nativeAvg, nativeMax, count }) => (
            <div
              key={source}
              className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
            >
              <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${SOURCE_COLORS[source]}`}>
                {SOURCE_LABELS[source]}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-neutral-900">
                  {nativeAvg.toFixed(1)}
                </span>
                <span className="text-sm text-neutral-400">/{nativeMax}</span>
              </div>
              <span className="text-xs text-neutral-400">
                {count} {count === 1 ? 'avaliação' : 'avaliações'}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
