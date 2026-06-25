# QA Fix Request — Epic 29 (Cleaning Portal)

**Date:** 2026-06-25  
**QA Tester:** Quinn (@qa)  
**Environment Tested:** Production (www.lodgra.io)  
**Status:** CRITICAL — 6 bugs found, features non-functional  
**Action:** Rollback initiated, hotfix required before re-deployment

---

## Executive Summary

Epic 29 deployment to production revealed **6 critical/high bugs** that render the cleaning portal non-functional:

- Date/time validation not working (accepts past dates/times)
- Template ID not being saved (NULL in database)
- Access Link not generated for cleaners
- Template items empty (seed failed)
- Template update endpoint broken
- Cleaner access flow completely blocked

**Recommendation:** Fix all 6 bugs before re-deployment to staging.

---

## Critical Bugs (Must Fix)

### 🔴 Bug #1: Date Validation Not Working

**Severity:** CRITICAL  
**Component:** `src/app/api/cleaning/tasks/route.ts` (POST handler)  
**Test Case:** Create task with `scheduled_date` in the past

**Current Behavior:**
```bash
POST /api/cleaning/tasks
{
  "property_id": "...",
  "scheduled_date": "2026-06-23",  # Past date
  "scheduled_time": "10:00",
  "checklist_template_id": "..."
}
→ Response: HTTP 201 (created)
→ Database: Task saved with past date ❌
```

**Expected Behavior:**
- Should return HTTP 400 or 422
- Error message: "Data não pode ser no passado" (Portuguese)
- Task should NOT be created

**Root Cause:** Date validation logic in frontend (`src/components/cleaning/TaskForm.tsx`) is NOT applied in backend API.

**Fix Location:** `src/app/api/cleaning/tasks/route.ts` — POST handler

**Implementation Required:**
```typescript
// In POST handler, add validation:
const scheduledDate = new Date(body.scheduled_date);
const today = new Date();
today.setHours(0, 0, 0, 0);

if (scheduledDate < today) {
  return NextResponse.json(
    { error: "Data não pode ser no passado" },
    { status: 400 }
  );
}
```

---

### 🔴 Bug #2: Time Validation Not Working

**Severity:** CRITICAL  
**Component:** `src/app/api/cleaning/tasks/route.ts` (POST handler)  
**Test Case:** Create task with `scheduled_time` in the past (today)

**Current Behavior:**
```bash
POST /api/cleaning/tasks
{
  "property_id": "...",
  "scheduled_date": "2026-06-25",  # Today
  "scheduled_time": "06:00",       # Past hour
  "checklist_template_id": "..."
}
→ Response: HTTP 201 (created)
→ Database: Task saved with past time ❌
```

**Expected Behavior:**
- If date = today AND time is in past → reject
- Error message: "Horário não pode ser no passado"
- Task should NOT be created

**Root Cause:** Backend does NOT check time validation for today's date.

**Fix Location:** `src/app/api/cleaning/tasks/route.ts` — POST handler

**Implementation Required:**
```typescript
// If scheduled_date is today, check time
if (scheduledDate.getTime() === today.getTime() && body.scheduled_time) {
  const [hours, minutes] = body.scheduled_time.split(':').map(Number);
  const scheduledDateTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    hours,
    minutes
  );
  
  if (scheduledDateTime < new Date()) {
    return NextResponse.json(
      { error: "Horário não pode ser no passado" },
      { status: 400 }
    );
  }
}
```

---

### 🔴 Bug #3: Template ID Not Being Saved (NULL in Database)

**Severity:** CRITICAL  
**Component:** `src/app/api/cleaning/tasks/route.ts` (POST handler)  
**Test Case:** Create task with valid `checklist_template_id`

**Current Behavior:**
```bash
POST /api/cleaning/tasks
{
  "property_id": "...",
  "scheduled_date": "2026-06-25",
  "checklist_template_id": "ab900cba-8ab4-4094-ad1e-dd0c29197a94"  # Valid UUID
}
→ Response: HTTP 201
{
  "id": "f6e09d95-...",
  "checklist_template_id": null  # ❌ Should not be null!
}
```

**Expected Behavior:**
- `checklist_template_id` should be saved from request body
- Database should store the template ID
- Response should echo back the saved value

**Root Cause:** POST handler receiving `checklist_template_id` but not saving it to database.

**Fix Location:** `src/app/api/cleaning/tasks/route.ts` — INSERT statement

**Check Code:**
```typescript
// Current code (probably):
const { data, error } = await admin
  .from('cleaning_tasks')
  .insert({
    // ... other fields
    checklist_template_id: body.checklist_template_id  // ← Is this being passed?
  });
```

**Debug Steps:**
1. Log `body.checklist_template_id` before insert
2. Verify database column name is correct: `checklist_template_id`
3. Check if Zod schema is removing this field (validate it's in schema)

---

### 🔴 Bug #4: Access Link Not Generated

**Severity:** CRITICAL  
**Component:** `src/app/api/cleaning/tasks/route.ts` (POST handler)  
**Test Case:** Create task and check `accessLink` in response

**Current Behavior:**
```bash
POST /api/cleaning/tasks
{...}
→ Response:
{
  "id": "f6e09d95-...",
  "accessLink": null  # ❌ Should be a URL with token
}
```

**Expected Behavior:**
- When creating task with `cleaner_id`, generate token
- Token should be 7-day valid token (SHA256 hash)
- Response should include: `accessLink: "/cleaner/auth?token={plainToken}"`

**Root Cause:** POST handler not generating access token for cleaner.

**Fix Location:** `src/app/api/cleaning/tasks/route.ts` — after task insert

**Implementation Required:**
```typescript
// After task insert succeeds:
if (cleaner_id) {
  // 1. Generate token
  const plainToken = generateRandomToken(); // 32 chars
  const tokenHash = hash(plainToken, 'sha256');
  
  // 2. Save to cleaner_access_tokens table
  await admin
    .from('cleaner_access_tokens')
    .insert({
      cleaner_id,
      organization_id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip_address: request.ip,
      user_agent: request.headers.get('user-agent')
    });
  
  // 3. Return access link
  accessLink = `/cleaner/auth?token=${plainToken}`;
}
```

---

### 🟡 Bug #5: Seeded Templates Have Empty Items

**Severity:** HIGH  
**Component:** `src/app/api/seed-templates-public/route.ts`  
**Test Case:** Call POST /api/seed-templates-public, verify template items

**Current Behavior:**
```bash
GET /api/templates/ab900cba.../
→ Response:
{
  "id": "ab900cba-...",
  "name": "Template A - T0/Studio",
  "items": []  # ❌ Should have 12 items
}
```

**Expected Behavior:**
- Template A: 12 items
- Template B: 8 items
- Template C: 9 items
- All items saved to `cleaning_checklist_items` table

**Root Cause:** Seed endpoint inserts templates but not the items.

**Fix Location:** `src/app/api/seed-templates-public/route.ts`

**Implementation Required:**
```typescript
// After creating each template, insert items:
const items = [
  { label: "Item 1", category: "Limpeza", is_required: true, order_index: 0 },
  { label: "Item 2", category: "Limpeza", is_required: false, order_index: 1 },
  // ... more items
];

await admin
  .from('cleaning_checklist_items')
  .insert(
    items.map(item => ({
      ...item,
      template_id: template.id
    }))
  );
```

---

### 🟡 Bug #6: Template Update Endpoint Broken

**Severity:** HIGH  
**Component:** `src/app/api/cleaning/templates/[id]/route.ts` (PUT handler)  
**Test Case:** Update template name

**Current Behavior:**
```bash
PUT /api/cleaning/templates/ab900cba.../
{
  "name": "Template A - Updated",
  "description": "...",
  "is_active": true,
  "items": []
}
→ Response: HTTP 400+
{
  "error": "Failed to update template"
}
```

**Expected Behavior:**
- HTTP 200 with updated template
- Name changed in database
- Items can be added/removed

**Root Cause:** PUT handler has generic error, not clear what's failing.

**Fix Location:** `src/app/api/cleaning/templates/[id]/route.ts`

**Debug Steps:**
1. Add detailed error logging to see actual Supabase error
2. Check if `organization_id` filter is blocking the update
3. Verify FIXED_ORG_ID is being used

**Implementation Required:**
```typescript
// In PUT handler, add better error handling:
try {
  const { data, error } = await admin
    .from('cleaning_checklist_templates')
    .update({
      name: body.name,
      description: body.description,
      is_active: body.is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('organization_id', FIXED_ORG_ID)
    .select();

  if (error) {
    console.error('Template update error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
  
  // Handle items separately (delete old, insert new)
  if (body.items && Array.isArray(body.items)) {
    // ... handle items update
  }
} catch (err) {
  console.error('Unexpected error:', err);
  return NextResponse.json(
    { error: 'Failed to update template' },
    { status: 500 }
  );
}
```

---

## Testing Checklist After Fixes

Once you fix the 6 bugs above, run these tests before marking complete:

- [ ] **Bug #1:** POST with past date → HTTP 400 error
- [ ] **Bug #2:** POST with past time (today) → HTTP 400 error
- [ ] **Bug #3:** POST with template_id → saved to DB (not NULL)
- [ ] **Bug #4:** POST with cleaner_id → accessLink returned
- [ ] **Bug #5:** Seed templates → items populated (12, 8, 9)
- [ ] **Bug #6:** PUT /api/templates/[id] → updates successfully

---

## Quality Gate Recheck

After fixes:
1. Run: `npm run lint`
2. Run: `npm test` (ensure 1514/1514 pass)
3. Run: `npm run typecheck`
4. Run: `npm run build`
5. Re-deploy to staging
6. Quinn (@qa) will re-test all 10 scenarios

---

## QA Observations

- Date validation is implemented in frontend (TaskForm.tsx) but NOT in backend
- Backend should NEVER trust frontend validation
- All POST/PATCH endpoints need server-side validation
- Error messages should be specific, not generic

---

**Filed by:** Quinn (@qa)  
**Rollback Initiated:** 2026-06-25 19:17 UTC  
**Expected Fix Time:** 2-4 hours for @dev  
**Re-test Timeline:** 1-2 hours after fixes pushed

