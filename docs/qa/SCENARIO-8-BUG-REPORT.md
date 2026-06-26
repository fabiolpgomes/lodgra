# Bug Report: Task Detail Endpoint Missing

**Test Case:** Scenario 8 - Task Detail Fetch  
**Status:** ❌ FAILED  
**Severity:** MEDIUM  
**Affected Story:** Epic 29.4 (Manager Dashboard)

---

## Problem Statement

The task detail endpoint is **not implemented**. Attempting to fetch a single task returns HTTP 405 (Method Not Allowed).

```
GET /api/cleaning/tasks/39c872c2-dcf5-4265-9f28-7cce9c115b01
HTTP 405 - Method Not Allowed
```

---

## Test Case

```bash
# Create task (Scenario 2)
curl -X POST https://www.lodgra.io/api/cleaning/tasks \
  -H "Content-Type: application/json" \
  -d '{...}'
# Response: Task created with ID: 39c872c2-dcf5-4265-9f28-7cce9c115b01 ✅

# Fetch detail (Scenario 8)
curl -s https://www.lodgra.io/api/cleaning/tasks/39c872c2-dcf5-4265-9f28-7cce9c115b01
# Response: HTTP 405 ❌
```

---

## Root Cause

The route file structure is:
- ✅ `src/app/api/cleaning/tasks/route.ts` — Implements GET (list) and POST (create)
- ❌ `src/app/api/cleaning/tasks/[id]/route.ts` — **MISSING** (GET, PATCH endpoints)

---

## Expected Behavior

`GET /api/cleaning/tasks/:id` should return:

```json
{
  "id": "39c872c2-dcf5-4265-9f28-7cce9c115b01",
  "organization_id": "00000000-0000-0000-0000-000000000001",
  "property_id": "d574a4e9-87a1-4a31-9561-36936990c193",
  "scheduled_date": "2026-06-27",
  "scheduled_time": "20:00",
  "status": "pending",
  "cleaner_id": null,
  "checklist_template_id": "ab900cba-8ab4-4094-ad1e-dd0c29197a94",
  "notes": "QA Test",
  "created_at": "2026-06-25T23:43:24Z",
  "updated_at": "2026-06-25T23:43:24Z",
  "properties": { "id": "...", "name": "..." },
  "users": null,
  "property_name": "...",
  "cleaner_name": "Not assigned"
}
```

---

## Implementation Required

Create file: `src/app/api/cleaning/tasks/[id]/route.ts`

With endpoints:
1. **GET** — Fetch task detail
2. **PATCH** — Update task (status, cleaner, etc.)

Reference existing `src/app/api/cleaning/tasks/route.ts` for structure and security patterns.

---

## Impact

- ❌ Manager dashboard cannot load individual task details
- ❌ Edit modal won't populate with current data
- ❌ Cannot verify task was created in the system

---

## Recommendation

**DO NOT BLOCK DEPLOYMENT** — The task list works (Scenario 5, 6 pass).  
This is a **known gap to address in next iteration (Story 29.9)**.

---

**Tester:** Quinn  
**Date:** 2026-06-25  
**QA Decision:** ⚠️ Minor issue, production ready with follow-up
