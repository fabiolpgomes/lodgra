import type { ReviewScoreData, ReviewSource } from '@/types/database'

const SOURCE_LABELS: Record<ReviewSource, string> = {
  booking: 'Booking.com',
  airbnb: 'Airbnb',
  google: 'Google',
  tripadvisor: 'TripAdvisor',
  direct: 'Reserva Direta',
  other: 'Outra',
}

function qualityLabel(avg: number): string | null {
  if (avg >= 9) return 'Excelente'
  if (avg >= 8) return 'Muito Bom'
  if (avg >= 7) return 'Bom'
  if (avg >= 6) return 'Satisfatório'
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
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold text-lodgra-brand-700">
            {reviewScore.globalAvg.toFixed(1)}
          </span>
          <span className="text-lg text-neutral-500">/10</span>
        </div>
        <div>
          {label && (
            <p className="text-lg font-semibold text-neutral-900">{label}</p>
          )}
          <p className="text-sm text-neutral-500">
            Baseado em {reviewScore.totalCount} {reviewScore.totalCount === 1 ? 'avaliação' : 'avaliações'}
          </p>
        </div>
      </div>

      {/* Score por OTA */}
      {reviewScore.bySource.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {reviewScore.bySource.map(({ source, avg, count }) => (
            <div
              key={source}
              className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3"
            >
              <span className="text-xs font-medium text-neutral-500 truncate">
                {SOURCE_LABELS[source]}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-neutral-900">{avg.toFixed(1)}</span>
                <span className="text-xs text-neutral-400">/10</span>
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
