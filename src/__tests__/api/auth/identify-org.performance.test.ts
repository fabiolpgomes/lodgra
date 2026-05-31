/**
 * Performance test for /api/auth/identify-org endpoint
 *
 * Tests AC5.1: Response time < 200ms (p95)
 *
 * Run with: npm run test:performance -- identify-org
 */

import fetch from 'node-fetch'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const TEST_EMAIL = 'test-perf@example.com'
const NUM_REQUESTS = 100
const P95_THRESHOLD_MS = 200

interface PerformanceResult {
  request: number
  duration: number
  status: number
  success: boolean
}

async function runPerformanceTest() {
  console.log('🚀 Starting identify-org performance test...')
  console.log(`Endpoint: POST ${BASE_URL}/api/auth/identify-org`)
  console.log(`Requests: ${NUM_REQUESTS}`)
  console.log(`P95 Target: ${P95_THRESHOLD_MS}ms\n`)

  const results: PerformanceResult[] = []

  // Warm up (not counted)
  console.log('⏳ Warming up...')
  try {
    await fetch(`${BASE_URL}/api/auth/identify-org`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL }),
    })
  } catch (err) {
    console.error('❌ Warm-up failed. Is the server running?')
    process.exit(1)
  }

  // Run performance tests
  console.log('📊 Running load test...\n')

  for (let i = 0; i < NUM_REQUESTS; i++) {
    const startTime = Date.now()

    try {
      const response = await fetch(`${BASE_URL}/api/auth/identify-org`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL }),
      })

      const duration = Date.now() - startTime

      results.push({
        request: i + 1,
        duration,
        status: response.status,
        success: response.status === 200 || response.status === 429,
      })

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ ${i + 1}/${NUM_REQUESTS} requests (${duration}ms)`)
      }
    } catch (error) {
      results.push({
        request: i + 1,
        duration: Date.now() - startTime,
        status: 0,
        success: false,
      })
      console.error(`  ✗ Request ${i + 1} failed:`, error)
    }
  }

  // Calculate statistics
  const durations = results.filter((r) => r.success).map((r) => r.duration)
  const sortedDurations = durations.sort((a, b) => a - b)

  const min = Math.min(...durations)
  const max = Math.max(...durations)
  const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)]
  const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)]
  const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)]

  const successCount = results.filter((r) => r.success).length
  const successRate = ((successCount / NUM_REQUESTS) * 100).toFixed(1)

  // Print results
  console.log('\n' + '='.repeat(60))
  console.log('📈 PERFORMANCE TEST RESULTS')
  console.log('='.repeat(60))

  console.log(`\nSuccess Rate: ${successRate}% (${successCount}/${NUM_REQUESTS})`)

  console.log('\nResponse Times:')
  console.log(`  Min:  ${min}ms`)
  console.log(`  P50:  ${p50}ms`)
  console.log(`  Avg:  ${avg}ms`)
  console.log(`  P95:  ${p95}ms ${p95 <= P95_THRESHOLD_MS ? '✅' : '❌'}`)
  console.log(`  P99:  ${p99}ms`)
  console.log(`  Max:  ${max}ms`)

  console.log('\n' + '='.repeat(60))

  // Verdict
  const passedP95 = p95 <= P95_THRESHOLD_MS
  const passedSuccessRate = successRate === '100.0'

  if (passedP95 && passedSuccessRate) {
    console.log('✅ PERFORMANCE TEST PASSED')
    console.log(`   P95 response time: ${p95}ms (target: ${P95_THRESHOLD_MS}ms)`)
    console.log(`   Success rate: ${successRate}%`)
    process.exit(0)
  } else {
    console.log('❌ PERFORMANCE TEST FAILED')
    if (!passedP95) {
      console.log(`   ⚠️  P95 too high: ${p95}ms (target: ${P95_THRESHOLD_MS}ms)`)
    }
    if (!passedSuccessRate) {
      console.log(`   ⚠️  Success rate: ${successRate}% (target: 100%)`)
    }
    process.exit(1)
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  runPerformanceTest().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}

export { runPerformanceTest }
