import { buildForecastPDFHtml } from '@/lib/export/pdfExport'
import type { ForecastingAPIResponse } from '@/types/forecasting'

describe('buildForecastPDFHtml', () => {
  it('formats forecast values with the provided currency', () => {
    const mockData: ForecastingAPIResponse = {
      forecasts: {
        days30: {
          id: '1',
          propertyId: 'prop1',
          forecastDate: '2026-07-22',
          forecastPeriodDays: 30,
          projectedRevenue: 2500,
          confidenceScore: 0.85,
          confidenceLevel: 'high',
          occupancyRateForecast: 0.75,
          seasonalFactor: 1.1,
          basePriceEstimate: 95,
          dataPointsCount: 15,
          reasoning: 'Based on historical data',
          createdAt: '2026-07-22',
          updatedAt: '2026-07-22',
        },
        days60: {
          id: '2',
          propertyId: 'prop1',
          forecastDate: '2026-07-22',
          forecastPeriodDays: 60,
          projectedRevenue: 5200,
          confidenceScore: 0.8,
          confidenceLevel: 'high',
          occupancyRateForecast: 0.73,
          seasonalFactor: 1.05,
          basePriceEstimate: 94,
          dataPointsCount: 30,
          reasoning: 'Based on historical data',
          createdAt: '2026-07-22',
          updatedAt: '2026-07-22',
        },
        days90: {
          id: '3',
          propertyId: 'prop1',
          forecastDate: '2026-07-22',
          forecastPeriodDays: 90,
          projectedRevenue: 7800,
          confidenceScore: 0.75,
          confidenceLevel: 'high',
          occupancyRateForecast: 0.72,
          seasonalFactor: 1.0,
          basePriceEstimate: 93,
          dataPointsCount: 45,
          reasoning: 'Based on historical data',
          createdAt: '2026-07-22',
          updatedAt: '2026-07-22',
        },
      },
      assumptions: {
        id: 'assum1',
        propertyId: 'prop1',
        analysisDate: '2026-07-22',
        baseRevenue90Days: 7800,
        avgOccupancyRate: 0.73,
        seasonalPattern: null,
        dayOfWeekPattern: null,
        holidayEvents: null,
        last90DaysBookings: 15,
        createdAt: '2026-07-22',
      },
      chartData: [
        { date: '2026-07-23', projected: 85, lower: 72, upper: 98 },
      ],
      summary: {
        currentMonthProjection: 2500,
        nextMonthProjection: 2700,
        quarterlyProjection: 7800,
        trendsDescription: 'Upward trend',
        seasonalityDescription: 'Summer peak',
        recommendations: ['Increase prices'],
      },
    }

    const html = buildForecastPDFHtml(
      mockData,
      'My Property',
      '2026-07-22',
      '2026-10-20',
      'BRL'
    )

    expect(html).toContain('Forecast Summary')
    expect(html).toContain('R$')
    expect(html).not.toContain('€')
    expect(html).not.toContain('(EUR)')
  })
})
