# Load Test Validation Checklist

**Story:** 12.4 — Stripe Quality  
**Date:** 2025-05-16  
**Environment:** Staging  

## Pre-Test Checklist

- [ ] Dev server running (`npm run dev`)
- [ ] Database seeded with test data
- [ ] Stripe test mode enabled
- [ ] k6 installed: `k6 --version`
- [ ] API token generated and available
- [ ] BASE_URL accessible and healthy

## Test Execution

```bash
# Record start time
START_TIME=$(date)

# Run load test with metrics export
k6 run \
  --out json=load-test-$(date +%s).json \
  --vus 100 \
  --duration 5m \
  tests/load/booking-payments.js

# Record end time
END_TIME=$(date)
```

## Post-Test Validation

### 1. Metrics Validation ✓

From k6 output, verify:

- [ ] **Total Requests:** 1,000+ (expect ~1,200)
- [ ] **Success Rate:** >= 95% (target: 98%+)
- [ ] **Failed Requests:** <= 50 (target: < 10)
- [ ] **p95 Latency:** < 800ms
- [ ] **p99 Latency:** < 1,000ms
- [ ] **Max Latency:** < 5,000ms

### 2. Database Validation ✓

```sql
-- Count payments created during test window
SELECT COUNT(*) as total_payments,
       SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as succeeded,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM payments
WHERE created_at >= now() - interval '10 minutes';

-- Expected: 100+ succeeded payments, < 10 failed
```

### 3. Sentry Validation ✓

Check Sentry dashboard during/after load test:

- [ ] No spike in error count
- [ ] Payment errors < 10 total
- [ ] No new error types detected
- [ ] Webhook processing normal

### 4. Stripe Validation ✓

Via Stripe Dashboard:

- [ ] 100+ charges processed
- [ ] Success rate > 95%
- [ ] No unusual decline patterns
- [ ] Webhook delivery: all delivered (no pending)

### 5. Server Health ✓

```bash
# Check API still responsive
curl -s http://localhost:3000/api/health | jq .status

# Check database connection pool
# Should show active connections < max configured

# Check memory usage
# Should not exceed 80% of available
```

## Results Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Success Rate | >= 95% | ___ % | ☐ PASS ☐ FAIL |
| p99 Latency | < 1,000ms | ___ ms | ☐ PASS ☐ FAIL |
| Total Errors | < 50 | ___ | ☐ PASS ☐ FAIL |
| Database Payments | >= 100 | ___ | ☐ PASS ☐ FAIL |

## Sign-Off

- [ ] All validations passed
- [ ] No critical issues discovered
- [ ] Payment system ready for production

**Validated By:** _____________  
**Date:** _____________

## Troubleshooting Guide

### Success Rate Below 95%

```bash
# Check error logs during test
k6 report load-test.json | grep -A 10 "failed"

# Common causes:
# 1. Rate limit exceeded — increase cache TTL
# 2. Database connection pool exhausted — increase pool size
# 3. Payment processor timeout — check Stripe status
# 4. Invalid test data — regenerate with proper schema
```

### High Latency (p99 > 1s)

```bash
# Profile payment endpoint
# Check query execution plans
EXPLAIN ANALYZE SELECT * FROM payments WHERE id = 'xxx';

# Common causes:
# 1. N+1 queries — add indexes on foreign keys
# 2. Lock contention — optimize transaction duration
# 3. Network latency — verify database location
```

### Database Payments < 100

```bash
# Check for failed inserts
SELECT status, COUNT(*) FROM stripe_events GROUP BY status;

# Common causes:
# 1. Webhook processing failed — check retry logic
# 2. Idempotency issues — verify unique constraint
# 3. Transaction rollback — check error logs
```

## Next Steps

1. ✅ Load test complete — save report for audit
2. ✅ Fix any HIGH/CRITICAL issues before production
3. ✅ Run full regression tests (Task 12)
4. ✅ Prepare for QA gate (Story status → Ready for Review)
