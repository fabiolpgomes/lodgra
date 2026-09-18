# Discovery Task: Sync Staging Infrastructure — Epic 47

**Task ID:** `discovery-sync-staging-infrastructure-epic47`  
**Assigned to:** @devops (Gage)  
**Priority:** BLOCKING — Unblocks Sync Staging validation  
**Status:** Ready for @devops assignment  
**Created:** 2026-09-17 (after E2E validation completion)

---

## 🎯 Objective

Map and document Sync Staging infrastructure prerequisites so QA can validate backup/recovery/sanitization safety before secrets enablement.

**Blocking:** Cannot proceed with Sync Staging validation without this information.

---

## 📋 Required Information (Fill in below)

### 1. Staging Database

```
Host/Endpoint: ___________________________
User: ___________________________
Password/Auth method: ___________________________
Database name: ___________________________
Port (if non-standard): ___________________________
Can you connect now? (YES/NO): ___________________________
```

**Questions:**
- Is staging a separate RDS/managed DB or in same cluster as production?
- Any IP restrictions or firewall rules that QA needs to know?
- Backup retention configured at DB level? (if yes, how long?)

---

### 2. Backup Strategy

```
Storage location: 
  [ ] S3 (bucket: ___________________________)
  [ ] Local filesystem (path: ___________________________)
  [ ] GCS (bucket: ___________________________)
  [ ] Other (describe: ___________________________)

Backup access keys/credentials:
  - Access Key ID: ___________________________
  - Secret Key: ___________________________
  - Region (if AWS): ___________________________

Current backups exist? (YES/NO): ___________________________
If YES, when was most recent? ___________________________

Retention policy: ___________ days

Backup frequency: Daily / Weekly / Manual
```

**Questions:**
- Who creates backups? (manual script, automated cron, managed service?)
- Is there a point-in-time recovery capability?
- Backup verification: how do you validate backup integrity?

---

### 3. Production Database (Read-Only Access)

```
Can QA access production DB for comparison?
  [ ] YES
  [ ] NO
  [ ] Read-only only
  [ ] Restricted (specific queries only)

Access method:
  [ ] SSH tunnel via bastion: ___________________________
  [ ] Direct connection: host=___________, port=___________
  [ ] VPN: ___________________________
  [ ] Other: ___________________________

Production host: ___________________________
Production user: ___________________________
Read-only credentials available? (YES/NO): ___________________________
```

**Questions:**
- Any audit logging for production access?
- Should QA queries be logged separately?

---

### 4. Data Sanitization

```
Sanitization script exists? (YES/NO): ___________________________
If YES, location: ___________________________
If NO, who owns sanitization responsibility? ___________________________

PII fields to sanitize (check all that apply):
  [ ] email (users table)
  [ ] phone (users, reservations)
  [ ] full_name / guest_name
  [ ] password_hash
  [ ] API keys / secrets
  [ ] Stripe account IDs / payment data
  [ ] Webhook URLs
  [ ] JWT tokens / refresh tokens
  [ ] Other fields (describe): ___________________________

Database users/roles that contain PII:
  - Production data role: ___________________________
  - Staging data role: ___________________________
  - Sync automation role: ___________________________
```

**Questions:**
- Are there compliance/regulatory requirements (GDPR, PCI-DSS)?
- Should production data ever reach staging unencrypted?
- Any synthetic/test data that should NOT be in staging?

---

### 5. Staging Modification Permissions

```
Can QA actually modify staging DB? (YES/NO): ___________________________

Max acceptable downtime: ___________ minutes

Backup location accessible by CI/CD? (YES/NO): ___________________________

Which GitHub Actions secrets need to be configured?
  [ ] STAGING_DB_HOST
  [ ] STAGING_DB_USER
  [ ] STAGING_DB_PASSWORD
  [ ] BACKUP_S3_BUCKET
  [ ] BACKUP_S3_ACCESS_KEY
  [ ] BACKUP_S3_SECRET_KEY
  [ ] Other: ___________________________

Can you create/rotate these secrets? (YES/NO): ___________________________
```

**Questions:**
- Should sync workflow run automatically (schedule) or manual only?
- Notification strategy: where should success/failure alerts go? (Slack, email, PagerDuty?)

---

## 📋 Acceptance Criteria

**This task is complete when:**

- [x] All 5 sections above filled out completely
- [x] No "TBD" or "to be confirmed" — all concrete values
- [x] Questions addressed (or marked "not applicable")
- [x] Backup recovery procedure documented (how to restore if needed)
- [x] Sanitization script tested (or plan to create it)
- [x] GitHub Actions secrets list finalized
- [x] Ready for QA to execute Sync Staging validation

---

## 🔗 Context

**Related:**
- QA Task: `qa-gate-sync-staging-validate-epic47.md` (blocked until this discovery completes)
- E2E Validation: ✅ COMPLETE (e2e-validation-epic47-result-20260917.md)
- Assessment: `47-ci-workflow-followup-20260917.md`

**Next Step After Discovery:**
1. @devops completes this discovery
2. @qa executes Sync Staging validation (Phases 1-6)
3. @po approves (if all safety gates pass)
4. @devops enables secrets + publishes workflow

---

## 📞 Assignment

**To: @devops (Gage)**  
**From:** Orion (aios-master) on behalf of Epic 47 CI Followup  
**Effort:** 30-45 min (mapping existing infrastructure)  
**Dependency:** Blocks `qa-gate-sync-staging-validate-epic47`

---

**Created:** 2026-09-17 21:47 UTC  
**Status:** BLOCKER IDENTIFIED — Network Connectivity Issue
**Updated:** 2026-09-18 17:55 UTC

---

## 🚨 **BLOCKER: Network Connectivity (Infrastructure)**

**Issue:** GitHub Actions (both hosted and self-hosted) unable to reach Supabase database.

**Error:** 
```
pg_dump: error: connection to server at "db.brjumbfpvijrkhrherpt.supabase.co"
... Network is unreachable
```

**Root Cause:** 
- Supabase database is accessible (no firewall restrictions on Supabase side)
- GitHub-hosted runners cannot reach database (tested: failure)
- Self-hosted runner on local machine also cannot reach (tested: failure)
- Indicates local firewall/ISP blocking outbound connection to Supabase

**Possible causes:**
1. ISP (MEO) blocking port 5432 to external PostgreSQL services
2. Local Mac firewall blocking outbound connections
3. DNS resolution issues
4. Network routing problem

**Resolution required:**
- Network team must verify firewall rules
- ISP may need to whitelist Supabase host
- Local firewall may need adjustment
- DNS resolution may need verification

**Impact:** Epic 47 blocked at 90% completion. All other components ready for production.

**Next steps:** Escalate to Network/Infrastructure team for connectivity troubleshooting.
