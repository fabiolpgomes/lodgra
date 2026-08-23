import { buildCompetitorReportCSV } from '@/lib/export/competitorReportCsv'
import type { BenchmarkReportData } from '@/types/competitor'

describe('buildCompetitorReportCSV', () => {
  const reportData: BenchmarkReportData = {
    property: {
      name: 'Apartamento Central',
      currentPrice: 125,
    },
    competitors: [
      {
        competitor: {
          id: 'comp-1',
          propertyId: 'prop-1',
          competitorUrl: 'https://example.com/listing',
          platform: 'booking.com',
          competitorName: 'Vista Mar',
          isActive: true,
          monitoringFrequency: 'daily',
          priceAlertThreshold: 10,
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
        currentPrice: 140,
        priceChange7d: -12.5,
        percentageChange7d: -8.2,
        daysMonitored: 14,
      },
    ],
    marketAnalysis: {
      marketAveragePrice: 132.5,
      marketRange: {
        min: 110,
        max: 155,
      },
      hostPrice: 125,
      pricePosition: 'competitive',
      percentageDifference: -5.7,
      competitorCount: 1,
      marketVolatility: 9.1,
      confidenceScore: 0.8,
      recommendation: 'Keep the current rate and monitor the market.',
    },
    generatedAt: '2026-08-23T00:00:00.000Z',
  }

  it('formats prices with the provided currency', () => {
    const csv = buildCompetitorReportCSV(reportData, 'Apartamento Central', 'BRL')

    expect(csv).toMatch(/R\$\s*125,00/)
    expect(csv).toMatch(/R\$\s*132,50/)
    expect(csv).toMatch(/R\$\s*110,00\s*-\s*R\$\s*155,00/)
    expect(csv).toMatch(/R\$\s*140,00/)
    expect(csv).toMatch(/12,50/)
    expect(csv).not.toContain('€')
  })
})
