# Google Vacation Rentals Feed — Health Runbook

**Last Updated:** 2026-05-16  
**Owners:** Backend Team, QA Team  
**Related:** [Story 27.2](../../docs/stories/27.2.story.md), [Story 27.4](../../docs/stories/27.4.story.md), [Google Distribution Dashboard](/admin/google-distribution)

---

## Service Overview

The Google Vacation Rentals Feed (`/api/feeds/google-vacation-rentals`) is a critical integration that enables properties to be listed on Google's Vacation Rentals platform. Feed health directly impacts property visibility and booking potential.

**Endpoints:**
- `GET /api/feeds/google-vacation-rentals` — Main feed generation
- `POST /api/admin/google-feed/refresh` — Manual refresh trigger

---

## Service Level Indicators (SLIs)

### Feed Generation Performance
- **Target:** <5 seconds for full property set (≥500 properties)
- **Acceptable:** p95 <4s, p99 <5s
- **Measurement:** Response time from endpoint `X-Generation-Time-Ms` header
- **Owner:** Backend (optimization responsibility)

### Feed Freshness
- **Target:** Feed updated within 1 hour of property changes
- **Acceptable:** Last update timestamp in log < 1h
- **Measurement:** Latest entry in `google_feed_logs` with status='success'
- **Owner:** Backend (scheduler responsibility)

### Feed Error Rate
- **Target:** <0.1% of feed generations fail
- **Acceptable:** <1 error per 1000 requests
- **Measurement:** `COUNT(*) WHERE status='failed'` / `COUNT(*) WHERE status IN ('success', 'failed', 'queued')`
- **Owner:** Backend (error handling responsibility)

### Property Indexing Rate
- **Target:** >80% of properties indexed within 7 days of feed submission
- **Acceptable:** 80-100% indexed
- **Measurement:** Via Google Search Console Property Insights
- **Owner:** Product team (feed quality responsibility)

---

## Alert Conditions

| Alert | Severity | Condition | Action |
|-------|----------|-----------|--------|
| **Feed Timeout** | CRITICAL | Response time >15s | Escalate to Backend Oncall |
| **Feed Generation Error** | HIGH | Error rate >0.1% over 1h | Check logs, investigate errors |
| **Sentry CRITICAL** | CRITICAL | Any CRITICAL error from feed endpoints | Page Oncall immediately |
| **Feed Freshness Lag** | MEDIUM | Last success >2h ago | Trigger manual refresh |
| **Property Indexing Stall** | MEDIUM | <70% properties indexed in 7 days | Audit feed quality |

---

## Monitoring Dashboard

**Primary Dashboard:** [Google Distribution Dashboard](/admin/google-distribution)

**Dashboard Metrics:**
- Total Indexed Properties
- Pending Feed Submissions
- Recent Feed Errors
- Feed Generation History (last 20 runs)

**Log Location:** `google_feed_logs` table in Supabase

---

## Troubleshooting Guide

### Symptom: Feed Generation Returns 500 Error

**Likely Causes:**
1. Supabase connection failure
2. Corrupted property data (invalid XML characters in name/description)
3. Out of memory (large dataset)
4. RLS policy blocking query

**Resolution Steps:**
1. Check Supabase status page
2. Query: `SELECT * FROM properties WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 1` — validate data
3. Check Sentry for detailed error message
4. Verify RLS policy allows `SELECT` on properties table
5. If data corruption: sanitize via `updateProperty(id, { name: sanitize(name) })`

**Prevention:**
- Input validation on property create/update
- Sanitize user input before storing in DB

---

### Symptom: Feed Returns HTTP 403 Premium Tier Error

**Likely Causes:**
1. User organization has no premium properties
2. Property tier was downgraded
3. Subscription expired

**Resolution Steps:**
1. Check user's properties: `SELECT * FROM properties WHERE organization_id = ? AND tier = 'premium'`
2. Verify subscription status in user_organizations table
3. If properties exist, upgrade organization tier
4. If subscription expired, prompt user to renew

**Prevention:**
- Auto-expire premium tier access based on subscription end_date
- Notify users 7 days before expiration

---

### Symptom: Feed Response Time Exceeds 5 Seconds

**Likely Causes:**
1. Large dataset (>1000 properties) — expected behavior, monitor p99
2. Supabase query slow (missing index)
3. Network latency spike
4. Image optimization bottleneck

**Resolution Steps:**
1. Check `X-Generation-Time-Ms` header to isolate issue
2. Query Supabase logs: `SELECT COUNT(*) FROM properties WHERE organization_id = ?`
3. If >1000 properties, performance degradation is expected (but should stay <5s)
4. Check for missing indexes: `EXPLAIN ANALYZE` on property queries
5. Monitor network latency from CDN/origin

**Prevention:**
- Add database index on `(organization_id, tier)` if not exists
- Implement pagination for large datasets
- Consider caching strategy if feed is accessed frequently

---

### Symptom: Feed Submission Returns 202 But Status Never Updates

**Likely Causes:**
1. Background job didn't execute
2. Job queue is stuck
3. Feed refresh log not being updated

**Resolution Steps:**
1. Check `google_feed_logs` table for recent entries with status='queued'
2. Query: `SELECT * FROM google_feed_logs WHERE status = 'queued' AND created_at < NOW() - INTERVAL '1 hour'`
3. If found, manually update: `UPDATE google_feed_logs SET status = 'failed', error_message = 'Job timeout' WHERE id = ?`
4. Trigger manual refresh from dashboard
5. Check Sentry for job execution errors

**Prevention:**
- Implement job timeout monitoring in background worker
- Alert if job hangs for >5 minutes
- Implement dead-letter queue for failed jobs

---

### Symptom: Sentry Shows "RLS Policy Blocking Feed Access"

**Likely Causes:**
1. RLS policy is too restrictive
2. Service role key not configured correctly
3. Organization ID mismatch

**Resolution Steps:**
1. Check RLS policy on `google_feed_logs` table
2. Verify `createClient()` is using server-side (service role) not client
3. Check endpoint implementation: `const supabase = await createClient()` — should use `@/lib/supabase/server`
4. Verify organization_id in policy matches authenticated user's org

**Prevention:**
- Use `createClient()` from `@/lib/supabase/server` (not client)
- Test RLS policy with both client and server keys
- Add detailed Sentry context: organization_id, user_id

---

## Maintenance Tasks

### Daily
- Monitor dashboard for errors or slowdowns
- Check Sentry for CRITICAL errors
- Verify feed freshness (<1h since last update)

### Weekly
- Review `google_feed_logs` for trends (error patterns)
- Check property indexing rate in Google Search Console
- Verify load testing targets still met (run manual load test)

### Monthly
- Audit feed quality (spot-check XML for correctness)
- Review Sentry performance metrics
- Plan optimization if p99 approaching 5s limit
- Update this runbook if new issues discovered

---

## Escalation Path

1. **First Line:** Backend Oncall reviews Sentry alert
2. **Second Line:** Database Team if RLS/query optimization needed
3. **Third Line:** Google API Support if integration issue confirmed

---

## Useful Queries

### Check Recent Feed Logs
```sql
SELECT id, timestamp, status, action, properties_count, duration_ms, error_message
FROM google_feed_logs
WHERE organization_id = ?
ORDER BY timestamp DESC
LIMIT 20;
```

### Find Slow Feed Generations
```sql
SELECT id, timestamp, duration_ms, properties_count
FROM google_feed_logs
WHERE status = 'success' AND duration_ms > 4000
ORDER BY duration_ms DESC
LIMIT 10;
```

### Check Premium Properties
```sql
SELECT COUNT(*), tier
FROM properties
WHERE organization_id = ?
GROUP BY tier;
```

### Monitor Error Trends
```sql
SELECT DATE(timestamp), COUNT(*), status
FROM google_feed_logs
WHERE organization_id = ?
GROUP BY DATE(timestamp), status
ORDER BY DATE(timestamp) DESC
LIMIT 30;
```

---

## Related Documentation

- [Google Vacation Rentals Feed API](../../docs/stories/27.2.story.md) — Story 27.2
- [Google Distribution Dashboard](../../docs/stories/27.4.story.md) — Story 27.4
- [Testing & Validation](../../docs/stories/27.5.story.md) — Story 27.5 (this story)

---

**Document Version:** 1.0  
**Last Reviewed:** 2026-05-16  
**Next Review:** 2026-06-16
