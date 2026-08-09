# Sync Jobs Operations Guide

**Quick Reference for Lodgra Sync System (Story 44.2)**

---

## 🎯 Quick Start

### Access Monitoring Dashboard
```
https://lodgra.io/pt-BR/sync
```

### Check Job Status
- **Next run:** Shows countdown (updates every second)
- **Success rate:** Job 1 (iCal) and Job 2 (Email)
- **Recent activity:** Last 10 executions with timestamps

---

## 📊 Understanding the Dashboard

### Job Cards (Left & Right)

**Blue Card (Job 1: iCal Sync)**
```
Taxa de Sucesso: 100%
├─ Criadas: 18 (new reservations)
├─ Atualizadas: 0 (updated reservations)
├─ Erros: 0 (failed records)
└─ Última execução: Sucesso ✓
```

**Green Card (Job 2: Email Enrichment)**
```
Taxa de Sucesso: 0%
├─ Criadas: 0 (emails processed)
├─ Atualizadas: 0 (reservations enriched)
├─ Erros: 0
└─ Última execução: Aguardando primeira execução...
```

### Activity Table

| Column | Meaning |
|--------|---------|
| **JOB** | 📅 iCal or 📧 Email |
| **PROPRIEDADE** | Property name (truncated 30 chars) |
| **STATUS** | ✓ Sucesso or ❌ Erro (hover for details) |
| **CRIADAS** | How many new items created |
| **ATUALIZADAS** | How many existing items updated |
| **ERROS** | Count of failed items |
| **QUANDO** | "5 hours ago" format |

### Status Message Examples

```
✓ Sem novidades     → Normal. No new reservations found.
✓ 5 nova(s), 2 atualizadas → Processed 5 new, updated 2 existing.
❌ Erro: [message]  → Something failed. Hover for details.
```

---

## 🔄 Normal Operation

### Expected Schedule
- **Job 1** runs: `00:00, 00:15, 00:30, 00:45, 01:00, ...` (every 15 min)
- **Job 2** runs: `00:00, 00:15, 00:30, 00:45, 01:00, ...` (every 15 min)

### Expected Results
- **Job 1:** Usually `0 nova(s)` (no new iCal events daily)
- **Job 2:** Usually `0 nova(s)` (emails already processed)
- **Success rate:** 100% (unless iCal URL is broken)

### When Job 1 Creates Reservations
```
Scenario: New booking on Airbnb
├─ Guest books on Airbnb
├─ iCal feed updates
├─ Job 1 runs (within 15 min)
├─ Reservation created in Lodgra
│  ├─ check_in / check_out from iCal ✓
│  ├─ guest_name from iCal ✓
│  └─ amount EMPTY (email needed)
└─ Awaiting Job 2 enrichment
```

### When Job 2 Enriches Reservations
```
Scenario: Email arrives with booking details
├─ Email from reservations@booking.com
├─ System parses with Claude AI
├─ Detects property_id
├─ Finds matching reservation
├─ Job 2 runs (within 15 min)
├─ Reservation updated
│  ├─ first_name, last_name ✓
│  ├─ number_of_guests ✓
│  └─ amount, currency ✓
└─ Reservation complete ✓
```

---

## ⚠️ Troubleshooting

### "AHS Casa Típica Portuguesa T2 appearing in sync logs"
**Issue:** Inactive property being synchronized  
**Fix:** Property marked as inactive but still has `sync_enabled = true`

**Check:**
```
Dashboard → PROPRIEDADE column → see property name
↓
Go to Properties admin
↓
Find property → Deactivate (is_active = false)
↓
Next Job 1 run will skip it ✓
```

### Error: "Supabase connection error"
**Issue:** API can't reach database  
**Check:**
1. Is Supabase up? (Check status page)
2. Wrong credentials in `.env`
3. pg_cron webhook URL wrong

**Fix:**
```bash
# Test endpoint manually
curl "http://localhost:3000/api/cron/sync-ical?secret={CRON_SECRET}"

# Should return JSON with results
```

### Error: "iCal URL returned 404"
**Issue:** Property's iCal feed is broken  
**Fix:**
1. Dashboard → Activity table → find property
2. Copy property name → go to admin
3. Edit property → re-generate iCal URL or remove sync
4. Verify new URL works in browser

### "Job shows 'Erro' — what do I do?"
**Solution:** Hover over row in activity table
```
Row with status "Erro" 
├─ Status badge shows "Erro"
├─ Hover reveals tooltip
│  └─ "Connection timeout" or "Invalid JSON" etc
└─ Error details tell you exactly what failed
```

---

## 🛠️ Manual Operations

### Run Job 1 Manually (Testing)
```bash
curl -X GET "http://localhost:3000/api/cron/sync-ical?secret={CRON_SECRET}"
```

**Expected Response:**
```json
{
  "message": "Sincronizados 5 anúncios",
  "synced": 5,
  "results": {
    "prop-id-1": { "created": 2, "updated": 0, "skipped": 0 },
    "prop-id-2": { "created": 1, "updated": 0, "skipped": 1 }
  }
}
```

### Run Job 2 Manually (Testing)
```bash
curl -X GET "http://localhost:3000/api/cron/enrich-reservations?secret={CRON_SECRET}"
```

**Expected Response:**
```json
{
  "enriched": 3,
  "skipped": 1,
  "errors": 0,
  "errorDetails": []
}
```

### View Job Execution History
**Supabase SQL:**
```sql
-- Last 20 sync operations
SELECT 
  sync_type,
  status,
  records_created,
  records_updated,
  records_failed,
  synced_at
FROM sync_logs
ORDER BY synced_at DESC
LIMIT 20;

-- Error details
SELECT 
  sync_type,
  error_message,
  synced_at
FROM sync_logs
WHERE status = 'failed'
ORDER BY synced_at DESC
LIMIT 10;
```

---

## 📈 Performance Metrics

### Expected Execution Time
- **Job 1 (sync-ical):** 5-30 seconds (depends on properties count)
- **Job 2 (enrich-reservations):** 2-10 seconds (depends on pending emails)

### Database Size
- **sync_logs:** ~500 rows per week (grows indefinitely, archive older than 90 days)
- **email_parse_log:** ~200 rows per week

### CPU/Memory Impact
- **Job 1:** Low (iCal parsing is efficient)
- **Job 2:** Low (email matching is simple JOIN)
- **Dashboard:** Light (lazy loads data on demand)

---

## 🚨 Critical Alerts

### Job hasn't run in 30+ minutes
**Action Required:**
1. Check dashboard "Próxima sincronização" countdown
2. If stuck, pg_cron may have crashed
3. Check Supabase logs for http_post errors
4. Restart pg_cron job:
   ```sql
   SELECT cron.schedule(
     'sync-ical-job',
     '*/15 * * * *',
     'SELECT http_post(...)'
   );
   ```

### Success rate < 50%
**Action Required:**
1. Check error messages in dashboard
2. Identify pattern (all properties failing or just one?)
3. If pattern: iCal feeds broken, email parser failing, etc.
4. If one property: that property's iCal URL likely invalid

### Job 2 not enriching anything
**Check:**
1. Are emails being received? (Check email_parse_log)
2. Are reservation_ids being matched? (Check JOIN logic)
3. Is email parser working? (Test: `npm run test -- email-parser`)

---

## 📞 Support Checklist

When reporting sync issues, provide:
- [ ] Screenshot from dashboard
- [ ] Property names affected (from Activity table)
- [ ] Time when issue started
- [ ] Last successful job run timestamp
- [ ] Error message (if visible)

---

## 🔐 Security Notes

### CRON_SECRET Management
- Store in `.env` (never commit)
- Rotate quarterly
- Use alphanumeric + symbols (32+ chars)
- In Supabase: set as `app.cron_secret` parameter

### Email Access
- Only Job 2 accesses email_parse_log
- Job 1 never reads email data
- No PII logged except in error_message (should be redacted)

---

## 📚 Related Documentation

- **Full Implementation:** `docs/stories/44.2-email-enrichment-implementation.md`
- **Database Schema:** See sync_logs & email_parse_log tables
- **API Reference:** `/api/cron/sync-ical`, `/api/cron/enrich-reservations`
- **Dashboard Code:** `src/app/[locale]/sync/page.tsx`

---

**Last Updated:** 2026-08-09  
**Owner:** Story 44.2 Team  
**Status:** Production Ready ✅
