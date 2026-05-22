# Production Monitoring Plan — Story 29.9

**Status:** Active (2026-05-22 onwards)  
**Story:** 29.9 — Photo Upload Enhancements (Realtime, HEIC, LCP Optimization)  
**Deployed:** 2026-05-22  
**Agent:** @qa (Quinn), @dev (Dex)

---

## Monitoring Scope

Post-deployment monitoring for:
1. **Realtime Performance** — Connection lifecycle, latency, fallback to polling
2. **HEIC Support** — Conversion success, iOS compatibility
3. **Image Optimization** — LCP metrics, lazy loading effectiveness
4. **User Feedback** — Issues reported, feature requests

---

## 1. Realtime Performance Monitoring

### Metrics to Track

**Server-Side (Supabase Logs):**
```
- Connection lifecycle events (join/leave)
- Channel subscription status (SUBSCRIBED/CHANNEL_ERROR/CLOSED)
- Error rates (realtime_errors / total_subscriptions)
- Reconnection attempts (exponential backoff effectiveness)
```

**Client-Side (Browser Console):**
```
Console log patterns:
✅ "Realtime connected" → connection successful
⚠️ "Realtime disconnected, starting polling fallback" → fallback activated
Error "Starting polling fallback due to: CHANNEL_ERROR" → connection error occurred
```

### Alert Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Photo load latency | > 2000ms | Investigate Supabase | 
| Polling fallback rate | > 10% of connections | Check Realtime status |
| Reconnection attempts | > 5 per session | Potential network instability |
| CHANNEL_ERROR frequency | > 1% of subscriptions | Alert @dev |

### How to Check

**Command Line (Vercel Logs):**
```bash
# View production logs filtered for Realtime events
vercel logs --scope lodgra --filter "Realtime" --follow

# Or via Vercel Dashboard → Project → Logs
```

**Expected Log Output:**
```
2026-05-22T10:30:45Z ✅ Realtime connected
2026-05-22T10:30:46Z Realtime status: SUBSCRIBED
2026-05-22T10:35:12Z ✅ Realtime connected (new session)
```

---

## 2. HEIC Support Monitoring

### iOS User Feedback Tracking

**Where Feedback Comes From:**
- GitHub Issues tagged `[heic]` or `[ios]`
- Slack #customer-support
- User emails to support@lodgra.io
- App crash logs (if conversion fails)

### Conversion Success Rate

**Monitor Metric:**
```
successful_heic_uploads / total_heic_uploads >= 95%
```

**Symptoms of Issues:**
1. **Conversion Failure:** "HEIC conversion failed" error message → check heic2any library version
2. **Quality Loss:** iOS users report blurry images → check compression settings
3. **File Rejection:** "Unsupported file format" → check file input accept attribute

### Action Items

| Issue | Investigation | Solution |
|-------|---|---|
| HEIC rejected | Is file input accept updated? | Verify `input.accept` includes `image/heic` |
| Conversion fails | Does browser support heic2any? | Fallback to JPG requirement or update library |
| Quality degraded | Canvas compression settings correct? | Verify 80% quality setting in compression pipeline |

---

## 3. Image Optimization Monitoring

### LCP Metrics (Ongoing)

**Source:** Vercel Analytics (Core Web Vitals dashboard)

**Target:**
- LCP < 2.5s (75th percentile)
- FID < 100ms
- CLS < 0.1

**Check Weekly:**
```
Vercel Dashboard → Project → Analytics → Core Web Vitals
Expected: All metrics in "Green" range
```

### Lazy Loading Effectiveness

**Monitor:**
- Images loaded on-scroll (not pre-loaded)
- No wasted bandwidth on off-screen images
- Scroll performance smooth (no jank)

**Check Method:**
```
1. Open Manager Dashboard
2. DevTools → Network tab → Filter by images
3. Scroll gallery
4. Verify: Off-screen images don't load until scroll
```

---

## 4. User Feedback Capture

### Feedback Channels

| Channel | How to Monitor | Frequency |
|---------|---|---|
| GitHub Issues | Search `[29.9]` or `[heic]` or `[photo-upload]` | Daily |
| Slack #support | Grep for "HEIC", "photo", "upload", "realtime" | Daily |
| Email | Check support@lodgra.io | Daily |
| Vercel Analytics | Dashboard → Feedback widget | Weekly |

### Feedback Template (if creating follow-up story)

```markdown
## User Feedback — Story 29.9 Follow-Up

**Feedback:** [What user reported]
**Category:** [HEIC | Image Quality | Performance | Realtime Delay | Concurrency]
**Severity:** [Low | Medium | High]
**Reporter:** [User/Source]

**Action:** [Create Story X.X if follow-up needed]
```

---

## 5. Daily Monitoring Checklist

**Morning (9:00 AM):**
- [ ] Check Vercel logs for Realtime errors (grep for CHANNEL_ERROR, polling fallback)
- [ ] Review Core Web Vitals (Analytics dashboard)
- [ ] Check GitHub Issues for new [29.9] or [heic] tags
- [ ] Scan Slack #support for HEIC/photo issues

**Weekly (Friday):**
- [ ] Lighthouse audit on production (sample random task)
- [ ] Review user feedback log → prioritize follow-ups
- [ ] Compile monitoring report (metrics, issues, insights)

---

## 6. Escalation Path

### If Issue Detected

**Realtime Latency > 2s:**
```
1. Check Supabase status page (status.supabase.com)
2. Check Vercel logs for errors
3. If persistent: Create Story 29.10 (Realtime optimization)
```

**HEIC Conversion Failure Rate > 5%:**
```
1. Check heic2any library version and compatibility
2. Test on iOS device
3. If systemic: Create Story 29.10 (HEIC robustness)
```

**LCP > 2.5s (sustained):**
```
1. Run Lighthouse on production → identify bottleneck
2. Check Next.js Image optimization config
3. If image-related: Create optimization story
```

---

## 7. Metrics Dashboard (Optional)

Consider setting up automated monitoring:

**Vercel Analytics + Custom Dashboards:**
- Realtime connection success rate
- HEIC upload success rate
- Photo load latency (p50, p75, p95)
- LCP/FID/CLS Core Web Vitals
- User feedback volume by category

**Tools:**
- Vercel Analytics (built-in)
- Supabase Logs (CLI or web UI)
- Custom dashboard (if needed)

---

## 8. Schedule

| Task | Frequency | Owner | Start Date |
|------|-----------|-------|-----------|
| Realtime error check | Daily (morning) | @qa | 2026-05-23 |
| Core Web Vitals review | Daily (morning) | @qa | 2026-05-23 |
| GitHub/Slack scan | Daily (morning) | @qa | 2026-05-23 |
| Weekly monitoring report | Friday EOD | @qa | 2026-05-24 |
| Lighthouse audit (sample) | Weekly | @qa | 2026-05-24 |

---

## 9. Monitoring Contacts

**Primary:** @qa (Quinn)  
**Secondary:** @dev (Dex)  
**Escalation:** @pm (Morgan)

---

*Monitoring Plan created: 2026-05-22*  
*Monitoring begins: 2026-05-23*  
*Duration: Ongoing (until next major update)*
