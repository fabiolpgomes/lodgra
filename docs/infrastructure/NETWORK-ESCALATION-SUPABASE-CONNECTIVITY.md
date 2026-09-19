# Network Escalation — Supabase Connectivity Issue

**Date:** 2026-09-18  
**Priority:** HIGH  
**Project:** Lodgra (Epic 47 — CI Workflow Followup)  
**Requestor:** Gage (@devops)  
**Status:** ROOT CAUSE IDENTIFIED — NOT A NETWORK/FIREWALL ISSUE, NO ESCALATION NEEDED

---

## ✅ **ROOT CAUSE (2026-09-18, corrected)**

This is **not** an ISP/firewall/DNS problem. It's the well-known Supabase IPv4/IPv6 gotcha:

- `db.brjumbfpvijrkhrherpt.supabase.co` (the **direct connection** host) only resolves to an **IPv6** address.
- GitHub-hosted runners and most residential ISPs (MEO included) either lack IPv6 routing entirely or have it partially broken — the OS returns `Network is unreachable` immediately (ENETUNREACH), which is exactly the error seen here. A firewall block would normally show as a timeout, not this error.
- Both runner types failing identically is the tell: it's not runner-specific, it's the destination address family.
- The Supabase web dashboard works because it doesn't go through this direct Postgres port — different path entirely.

**Fix:** stop using the direct connection string. Use the **Supavisor pooler** connection string instead, which is IPv4-compatible. No code/workflow changes needed — only the two GitHub secret **values**.

### Steps
1. Supabase Dashboard → each project (prod + staging) → **Project Settings → Database → Connect** → select the **Session pooler** tab (not Transaction mode — pg_dump needs session-level behavior; transaction mode pooling breaks on prepared statements).
2. Copy the string, format:
   `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`
3. Update the GitHub secrets `SUPABASE_DB_URL_PROD` and `SUPABASE_DB_URL_STAGING` with these pooler strings (same secret names — `sync-staging.yml` and `sync-prod-to-staging.sh` need no edits).
4. Re-run: `gh workflow run sync-staging.yml`.
5. If pooler ever causes issues for this use case, the paid fallback is the **Dedicated IPv4 Address** add-on (~$4/mo) on the direct connection — not needed here, pooler is free and sufficient for `pg_dump`/`psql`.

No network team action required. Original diagnosis below kept for reference.

---

---

## 🚨 **ISSUE SUMMARY**

GitHub Actions (both hosted and self-hosted runners) cannot establish database connections to Supabase.

**Error:**
```
pg_dump: error: connection to server at "db.brjumbfpvijrkhrherpt.supabase.co" (2a05:d018:135e:16ab:fdb0:8bee:2b39:a039), port 5432 failed: Network is unreachable
```

---

## 🔍 **DIAGNOSIS**

### What Works ✅
- Supabase database is online and accessible from web dashboard
- Supabase has **NO firewall restrictions** (tested: Network settings show all IPs allowed)
- GitHub secrets are correctly configured
- GitHub Actions workflow is properly configured
- Self-hosted runner is online and operational

### What Fails ❌
- GitHub-hosted runners cannot reach Supabase (port 5432)
- Self-hosted runner (on local machine) cannot reach Supabase (port 5432)
- Same error regardless of runner type

### Root Cause Analysis 🔎
Since **both** GitHub-hosted and self-hosted runners fail, the blocker is **not** GitHub Actions infrastructure.

**Likely causes:**
1. **ISP firewall (MEO)** — Blocking outbound connections to port 5432 (PostgreSQL)
2. **Local Mac firewall** — Blocking outbound connections to external PostgreSQL
3. **DNS resolution issue** — Cannot resolve `db.brjumbfpvijrkhrherpt.supabase.co`
4. **Network routing** — Path to Supabase blocked at ISP/firewall level

---

## 📊 **IMPACT**

| Component | Status | Notes |
|-----------|--------|-------|
| **E2E Tests** | ✅ PASS | 22/24 tests passing, cookie modal fixed |
| **Sanitization Function** | ✅ DEPLOYED | Production-ready SQL function |
| **CI/CD Workflow** | ✅ READY | Enabled, secrets configured, runner online |
| **Database Access** | ❌ BLOCKED | Cannot execute pg_dump for backup/sync |
| **Epic 47 Publication** | ⏳ DELAYED | 90% complete, awaiting network resolution |

---

## 🎯 **REQUIRED ACTIONS**

### Immediate (Network Team)

```
1. Verify DNS resolution:
   $ nslookup db.brjumbfpvijrkhrherpt.supabase.co
   
2. Test connectivity to Supabase:
   $ telnet db.brjumbfpvijrkhrherpt.supabase.co 5432
   
3. Check ISP firewall rules:
   - Verify port 5432 outbound is not blocked
   - Check if PostgreSQL connections to external services are restricted
   - Consider whitelisting Supabase host (db.brjumbfpvijrkhrherpt.supabase.co)
   
4. Check local Mac firewall:
   - Verify outbound rules allow connections to Supabase
   - Consider exception for PostgreSQL connections
```

### Verification (After Resolution)

```
1. Test connectivity from Mac:
   $ pg_dump -h db.brjumbfpvijrkhrherpt.supabase.co -U postgres [DATABASE]
   
2. Retry GitHub Actions workflow:
   $ gh workflow run .github/workflows/sync-staging.yml
   
3. Verify pg_dump completes successfully
4. Confirm backup/restore cycle works
```

---

## 📋 **TECHNICAL DETAILS**

**Target Database:**
- Host: `db.brjumbfpvijrkhrherpt.supabase.co`
- Port: `5432` (standard PostgreSQL)
- Protocol: PostgreSQL (requires port 5432 open)
- SSL: Not required (tested with SSL disabled, same error)

**Source IPs:**
- GitHub-hosted runners: Multiple regions (140.82.112.0/20 approximate range)
- Self-hosted runner: User's local Mac (ISP-assigned)

**Error Pattern:**
```
IPv6: 2a05:d018:135e:16ab:fdb0:8bee:2b39:a039 (Supabase server)
Connection attempt: Fail
Network is unreachable
```

---

## 📞 **ESCALATION CHAIN**

1. **Network/Infrastructure Team** ← **Current step**
   - Diagnose firewall/ISP issue
   - Implement fix (whitelist, exceptions, etc)
   - Verify connectivity restored

2. **DevOps (@devops - Gage)**
   - Retry workflow after network fix
   - Validate backup/restore cycle
   - Clear Epic 47 for publication

3. **Product Owner (@po - Pax)**
   - Approve for production publication
   - Authorize sync-staging.yml workflow

4. **QA (@qa - Quinn)**
   - Final validation (if needed)
   - Smoke tests

---

## 🚀 **TIMELINE**

```
2026-09-18: Network issue identified, escalated
2026-09-??: Network team investigates and implements fix
2026-09-??: DevOps verifies resolution and retries workflow
2026-09-??: Epic 47 published to production
```

**Blocker on Network Team response time.**

---

## 📁 **RELATED DOCUMENTATION**

- **Epic 47 Status:** `docs/qa/assessments/EPIC-47-FINAL-STATUS.md`
- **Discovery Form:** `docs/qa/assessments/discovery-sync-staging-infrastructure-epic47.md`
- **Workflow Definition:** `.github/workflows/sync-staging.yml`

---

## ✉️ **CONTACT**

**DevOps Lead:** Gage (@devops)  
**Project Lead:** Pax (@po)  
**Escalation Date:** 2026-09-18 18:00 UTC

---

**Standing by for network team resolution.**

*Self-hosted runner (mac-runner-1) online and ready to retry workflow upon network fix.*
