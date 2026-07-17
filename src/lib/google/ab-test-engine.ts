import * as Sentry from '@sentry/nextjs'

interface ABTestVariant {
  id: string
  name: string
  description: string
  changes: Record<string, unknown> // e.g., { price: 120, description: "..." }
  startDate: string
  endDate: string
}

interface ABTestMetrics {
  variantId: string
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  conversionRate: number
  revenue?: number
}

interface ABTest {
  id: string
  propertyId: string
  testName: string
  hypothesis: string
  control: ABTestVariant
  variants: ABTestVariant[]
  startDate: string
  endDate?: string
  status: 'planning' | 'running' | 'completed' | 'cancelled'
  results?: {
    control: ABTestMetrics
    variants: ABTestMetrics[]
    winner?: string
    confidence: number // 90%, 95%, 99%
    statisticalSignificance: boolean
  }
  createdAt: string
}

interface ABTestResult {
  testId: string
  propertyId: string
  winner?: string
  winnerLift: number // % improvement
  confidence: number
  recommendation: string
  nextSteps: string[]
}

export class ABTestEngine {
  createTest(
    propertyId: string,
    testName: string,
    hypothesis: string,
    control: ABTestVariant,
    variants: ABTestVariant[]
  ): ABTest {
    try {
      const testId = `test-${propertyId}-${Date.now()}`

      return {
        id: testId,
        propertyId,
        testName,
        hypothesis,
        control,
        variants,
        startDate: new Date().toISOString(),
        status: 'planning',
        createdAt: new Date().toISOString(),
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'ABTestEngine', propertyId },
      })
      throw error
    }
  }

  analyzeResults(test: ABTest, controlMetrics: ABTestMetrics, variantMetrics: ABTestMetrics[]): ABTestResult {
    try {
      const result: ABTestResult = {
        testId: test.id,
        propertyId: test.propertyId,
        confidence: 0,
        winnerLift: 0,
        recommendation: '',
        nextSteps: [],
      }

      // Statistical significance check (simplified Chi-square)
      const testResults = this.performStatisticalTest(controlMetrics, variantMetrics)

      if (!testResults.isSignificant) {
        result.recommendation =
          'Test not statistically significant yet. Continue running test or increase sample size.'
        result.confidence = testResults.confidence
        result.nextSteps = ['Run test for at least 2-4 weeks', 'Target 100+ conversions per variant']
        return result
      }

      // Find winner
      const improvements = variantMetrics.map((v, idx) => ({
        variantId: test.variants[idx].id,
        variantName: test.variants[idx].name,
        lift: this.calculateLift(controlMetrics.conversionRate, v.conversionRate),
      }))

      const topVariant = improvements.reduce((a, b) =>
        a.lift > b.lift ? a : b
      )

      if (topVariant.lift > 0) {
        result.winner = topVariant.variantId
        result.winnerLift = topVariant.lift
        result.confidence = testResults.confidence
        result.recommendation = `Variant "${topVariant.variantName}" wins with ${topVariant.lift.toFixed(1)}% improvement (${testResults.confidence.toFixed(0)}% confidence).`
        result.nextSteps = [
          'Deploy winning variant to all traffic',
          'Monitor for 2 weeks to confirm performance',
          'Run next optimization test',
        ]
      } else {
        result.recommendation = 'Control outperforms all variants. Keep current version.'
        result.nextSteps = ['Analyze why variants underperformed', 'Test different hypothesis']
      }

      return result
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'ABTestEngine', method: 'analyzeResults' },
      })

      return {
        testId: test.id,
        propertyId: test.propertyId,
        confidence: 0,
        winnerLift: 0,
        recommendation: 'Analysis failed',
        nextSteps: ['Contact support'],
      }
    }
  }

  private performStatisticalTest(
    control: ABTestMetrics,
    variants: ABTestMetrics[]
  ): { isSignificant: boolean; confidence: number } {
    // Simplified statistical test (Chi-square approximation)
    // In production, use proper statistical library (jstat, simple-statistics)

    const minSampleSize = 100 // Minimum conversions needed per variant

    // Check if sufficient sample size
    if (control.conversions < minSampleSize || variants.some((v) => v.conversions < minSampleSize)) {
      return { isSignificant: false, confidence: 50 }
    }

    // Chi-square test for independence
    let chisquare = 0

    for (const variant of variants) {
      const expectedClicksControl =
        (control.impressions / (control.impressions + variant.impressions)) *
        (control.clicks + variant.clicks)
      const expectedClicksVariant =
        (variant.impressions / (control.impressions + variant.impressions)) *
        (control.clicks + variant.clicks)

      if (expectedClicksControl > 0) {
        chisquare += Math.pow(control.clicks - expectedClicksControl, 2) / expectedClicksControl
      }
      if (expectedClicksVariant > 0) {
        chisquare += Math.pow(variant.clicks - expectedClicksVariant, 2) / expectedClicksVariant
      }
    }

    // Map chi-square to confidence (simplified)
    // Chi-square 2.71 = 90% confidence, 3.84 = 95%, 6.63 = 99%
    let confidence = 50
    if (chisquare >= 6.63) confidence = 99
    else if (chisquare >= 3.84) confidence = 95
    else if (chisquare >= 2.71) confidence = 90

    return {
      isSignificant: confidence >= 90,
      confidence,
    }
  }

  private calculateLift(controlRate: number, variantRate: number): number {
    if (controlRate === 0) return 0
    return ((variantRate - controlRate) / controlRate) * 100
  }

  generateTestPlan(propertyData: Record<string, unknown>): ABTest[] {
    const tests: ABTest[] = []

    // Test 1: Price optimization
    const currentPrice = (propertyData.price as number) || 100
    tests.push(
      this.createTest(
        String(propertyData.id),
        'Price Optimization',
        'Lower price increases conversion rate',
        {
          id: 'control-price',
          name: 'Control (Current Price)',
          description: `Current nightly rate: ${currentPrice}`,
          changes: { price: currentPrice },
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        [
          {
            id: 'variant-price-down',
            name: 'Price -10%',
            description: `Reduced nightly rate: ${Math.round(currentPrice * 0.9)}`,
            changes: { price: Math.round(currentPrice * 0.9) },
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'variant-price-up',
            name: 'Price +10%',
            description: `Increased nightly rate: ${Math.round(currentPrice * 1.1)}`,
            changes: { price: Math.round(currentPrice * 1.1) },
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ]
      )
    )

    // Test 2: Description impact
    tests.push(
      this.createTest(
        String(propertyData.id),
        'Description Expansion',
        'Detailed description increases CTR',
        {
          id: 'control-desc',
          name: 'Control (Current)',
          description: 'Current description length',
          changes: {},
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        [
          {
            id: 'variant-desc-expanded',
            name: 'Expanded Description',
            description: 'With amenities and house rules',
            changes: { descriptionExpanded: true },
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ]
      )
    )

    return tests
  }
}

export const abTestEngine = new ABTestEngine()
