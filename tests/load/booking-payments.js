/**
 * Story 12.4: Load Testing — 100 Concurrent Booking Payments
 * Simulates realistic payment load with k6
 * Run: k6 run tests/load/booking-payments.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const paymentDuration = new Trend('payment_duration_ms')
const paymentErrors = new Counter('payment_errors')
const paymentSuccess = new Counter('payment_success')
const paymentRate = new Rate('payment_success_rate')

// Load test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp-up to 20 VUs over 30s
    { duration: '1m30s', target: 100 }, // Ramp-up to 100 VUs over 1m30s
    { duration: '3m', target: 100 }, // Stay at 100 VUs for 3 minutes
    { duration: '30s', target: 0 }, // Ramp-down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(99)<1000'], // 99% of requests under 1s
    payment_success_rate: ['rate>0.95'], // 95%+ success rate
    payment_errors: ['count<50'], // Less than 50 errors
  },
  insecureSkipTLSVerify: true,
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function bookingPaymentLoadTest() {
  // 1. Create booking payload
  const bookingPayload = {
    property_id: `prop_${Math.floor(Math.random() * 1000)}`,
    guest_email: `guest_${__VU}_${__ITER}@example.com`,
    check_in: '2025-05-20',
    check_out: '2025-05-27',
    total_nights: 7,
    nightly_rate: 100,
    total_amount: 700,
  }

  // 2. Create payment intent
  const paymentIntentRes = http.post(
    `${BASE_URL}/api/billing/create-intent`,
    JSON.stringify(bookingPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${__ENV.API_TOKEN || 'test-token'}`,
      },
    }
  )

  const paymentIntentSuccess = check(paymentIntentRes, {
    'create intent: status 200': (r) => r.status === 200,
    'create intent: has client_secret': (r) => r.json('client_secret') !== undefined,
  })

  if (!paymentIntentSuccess) {
    paymentErrors.add(1)
    paymentRate.add(false)
    return
  }

  sleep(0.5)

  const clientSecret = paymentIntentRes.json('client_secret')

  // 3. Confirm payment
  const confirmPayload = {
    client_secret: clientSecret,
    payment_method: `pm_${Math.random().toString(36).substring(7)}`,
  }

  const confirmRes = http.post(
    `${BASE_URL}/api/billing/confirm-payment`,
    JSON.stringify(confirmPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${__ENV.API_TOKEN || 'test-token'}`,
      },
    }
  )

  const duration = confirmRes.timings.duration
  paymentDuration.add(duration)

  const confirmSuccess = check(confirmRes, {
    'confirm payment: status 200': (r) => r.status === 200,
    'confirm payment: status created or succeeded': (r) =>
      r.status === 200 || r.status === 201,
    'confirm payment: response time < 1s': (r) => r.timings.duration < 1000,
    'confirm payment: has status': (r) => r.json('status') !== undefined,
  })

  if (confirmSuccess) {
    paymentSuccess.add(1)
    paymentRate.add(true)
  } else {
    paymentErrors.add(1)
    paymentRate.add(false)
  }

  sleep(1) // Think time between transactions
}

export function teardown() {
  // Summary available in k6 output
  console.log('Load test completed')
}
