# Load Testing — Booking Payments

**Story:** 12.4 — Stripe Quality  
**Test Coverage:** 100 concurrent booking payment transactions  
**Duration:** 5 minutes  
**Success Criteria:** 95%+ success rate, <1s p99 latency

## Overview

Load testing validates that the payment system can handle production-level concurrent traffic without degradation. This test simulates 100 simultaneous users processing booking payments over a 5-minute period.

## Prerequisites

```bash
# Install k6 load testing tool
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Windows (via chocolatey)
choco install k6
```

## Running the Load Test

### Development Environment

```bash
# Start dev server
npm run dev

# In another terminal, run load test
k6 run tests/load/booking-payments.js
```

### Staging Environment

```bash
BASE_URL=https://staging.lodgra.com \
API_TOKEN=sk_test_xxx \
k6 run tests/load/booking-payments.js
```

### With HTML Report

```bash
k6 run \
  --out json=report.json \
  tests/load/booking-payments.js

# Generate HTML report
k6 report report.json
```

## Test Scenario

1. **Ramp-up Phase (2 minutes)**
   - 0-30s: Ramp to 20 virtual users
   - 30s-2m: Ramp to 100 virtual users

2. **Load Phase (3 minutes)**
   - Maintain 100 concurrent users
   - Each user completes booking payment flow

3. **Ramp-down Phase (30 seconds)**
   - Gracefully reduce load to 0 users

## Metrics & Thresholds

| Metric | Threshold | Description |
|--------|-----------|-------------|
| `http_req_duration` | p(99) < 1000ms | 99th percentile under 1 second |
| `payment_success_rate` | > 95% | Success rate above 95% |
| `payment_errors` | < 50 | Total errors less than 50 |

## Expected Results

✅ **Good Performance:**
```
Concurrent Users: 100
Total Requests: ~1200
Success Rate: > 98%
p99 Latency: 500-800ms
Errors: < 10
```

⚠️ **Warning Signs:**
- Success rate < 95%
- p99 latency > 2000ms
- Timeout errors increasing over time

## Troubleshooting

### High Error Rate
- Check API rate limiting: `GET /api/health` should return 200
- Verify database connection pool size
- Review Stripe API quota

### High Latency
- Check payment processor response times
- Monitor database query performance
- Review network connectivity

### Payment Intent Failures
- Verify `API_TOKEN` is valid
- Check `BASE_URL` is accessible
- Ensure payment endpoints are deployed

## Post-Test Analysis

1. Check Sentry for errors during load test
2. Review database slow query logs
3. Monitor payment processor metrics (Stripe dashboard)
4. Validate all 100 payment transactions recorded in database

## Automation

This test is run automatically during CI/CD:

```yaml
# .github/workflows/load-test.yml
- name: Run load test
  run: |
    k6 run tests/load/booking-payments.js \
      --out json=load-test-report.json
- name: Check thresholds
  run: |
    k6 report load-test-report.json | grep PASSED || exit 1
```

## Reference

- [k6 Documentation](https://k6.io/docs/)
- [Stripe Load Testing](https://stripe.com/docs/load-testing)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/load-testing/)
