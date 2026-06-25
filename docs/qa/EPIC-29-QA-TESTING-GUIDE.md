# Epic 29 — QA Testing Guide (Staging)

**Status:** Ready for Staging Testing  
**Test Environment:** https://staging-lodgra.vercel.app  
**Date:** 2026-06-25

---

## Quick Setup

### 1. Seed Templates
```bash
curl -X POST https://staging-lodgra.vercel.app/api/seed-templates-public
```

**Expected Response:**
```json
{
  "success": true,
  "results": [
    { "name": "Template A - T0/Studio", "status": "created", "items_count": 12 },
    { "name": "Template B - T1/T2", "status": "created", "items_count": 8 },
    { "name": "Template C - T3/T4/Vivenda", "status": "created", "items_count": 9 }
  ]
}
```

### 2. Login as Manager
- Email: `manager@lodgra.io`
- Password: (from team Slack)
- Role: gestor/manager

---

## Test Scenarios

### ✅ Scenario 1: Manager Dashboard Load

**Steps:**
1. Navigate to `/pt-BR/cleaning/manage`
2. Wait for page load
3. Verify title: "GERENCIAR TAREFAS DE LIMPEZA"
4. Verify button: "+ Nova Tarefa"
5. Verify empty table with filters

**Expected Results:**
- [ ] Page loads in < 2 seconds
- [ ] Title visible
- [ ] Button clickable
- [ ] No console errors
- [ ] Filter dropdowns loaded (status, property, date)

**Pass/Fail:** ___

---

### ✅ Scenario 2: Create New Task

**Steps:**
1. Click "+ Nova Tarefa"
2. Select property from dropdown
3. Select date (today or tomorrow)
4. Select time (future time if today)
5. Select cleaner (optional)
6. Select template (required)
7. Add notes (optional)
8. Click "Criar Tarefa"

**Expected Results:**
- [ ] Form fields load without errors
- [ ] Property dropdown shows >= 5 properties
- [ ] Date picker opens (dd/mm/yyyy format)
- [ ] Time picker shows valid times
- [ ] Cleaner dropdown populated
- [ ] Template dropdown shows 3 templates
- [ ] Form submits successfully
- [ ] Task appears in list after submit
- [ ] Success message or toast notification

**Notes:**
- Test with today's date + future hour ← **IMPORTANT**
- Test with future date
- Test with all optional fields empty
- Verify token generated in response

**Pass/Fail:** ___

---

### ✅ Scenario 3: Date Validation

**Steps:**
1. Open create form
2. Try date in past
3. Try today with past hour
4. Try today with future hour
5. Try future date

**Expected Results:**
- [ ] Past date: Error message "Data não pode ser no passado"
- [ ] Today + past hour: Error message "Horário não pode ser no passado"
- [ ] Today + future hour: ✅ Accepted
- [ ] Future date: ✅ Accepted
- [ ] Error messages in Portuguese

**Pass/Fail:** ___

---

### ✅ Scenario 4: Template Management

**Steps:**
1. Navigate to `/pt-BR/cleaning/templates`
2. Verify 3 templates listed
3. Click edit (pencil icon) on Template A
4. Change name (add " - Editado")
5. Add a new item
6. Remove an existing item
7. Save changes
8. Verify changes in list

**Expected Results:**
- [ ] Templates page loads
- [ ] 3 templates visible with names and item counts
- [ ] Edit page opens (not 404)
- [ ] Can modify template name
- [ ] Can add items (with label, category, required flag)
- [ ] Can remove items
- [ ] Save button works
- [ ] Changes persist after reload
- [ ] List shows updated name

**Pass/Fail:** ___

---

### ✅ Scenario 5: Table Filters

**Steps:**
1. Go to Manager Dashboard
2. Create 3 tasks with different statuses (if possible)
3. Filter by status = "pending"
4. Filter by status = "done"
5. Filter by date range
6. Clear filters

**Expected Results:**
- [ ] Status filter works (shows only matching tasks)
- [ ] Date range filter works
- [ ] Multiple filters work together
- [ ] Clear button resets all filters
- [ ] Pagination works (if > 20 tasks)

**Pass/Fail:** ___

---

### ✅ Scenario 6: Task List & Pagination

**Steps:**
1. Create >= 20 tasks
2. Verify first page shows 20 items
3. Click next/load more
4. Verify second page loads
5. Click previous

**Expected Results:**
- [ ] Pagination shows 20 items per page
- [ ] Navigation buttons work
- [ ] No duplicate items across pages
- [ ] Total count accurate

**Pass/Fail:** ___

---

### ✅ Scenario 7: Cleaner Access (Token Flow)

**Steps:**
1. Create task (note the accessLink from API)
2. Copy token link: `/cleaner/auth?token=...`
3. Open link in new incognito window
4. Should redirect to task detail page
5. Verify task details show:
   - Property name + address
   - Scheduled date/time
   - Checklist items
   - Status badge (pending)

**Expected Results:**
- [ ] Token validates
- [ ] Redirects to task page
- [ ] Cleaner sees task details
- [ ] No authentication required (token-based)
- [ ] Property info displayed correctly

**Pass/Fail:** ___

---

### ✅ Scenario 8: Cleaner Task Execution

**Steps:**
1. Access task as cleaner (via token)
2. Click "Iniciar Limpeza"
3. Verify status changes to "Em Progresso"
4. Mark 50% of checklist items
5. Verify progress bar updates
6. Add notes in "Notas após Limpeza" field
7. Try clicking "Finalizar" (should fail if not 100%)
8. Mark remaining items
9. Click "Finalizar"
10. Verify status = "Concluída"

**Expected Results:**
- [ ] "Iniciar Limpeza" button clickable when status = pending
- [ ] Status updates to in_progress
- [ ] Checklist items are checkboxes
- [ ] Progress bar updates in real-time
- [ ] Can add notes (up to 500 chars)
- [ ] "Finalizar" disabled until 100% complete
- [ ] When 100%, button becomes enabled
- [ ] Final status = done
- [ ] Timestamp shows completion time

**Pass/Fail:** ___

---

### ✅ Scenario 9: Real-time Updates

**Steps:**
1. Open Manager Dashboard in one window (Browser A)
2. Open Cleaner Task in another window (Browser B, incognito)
3. In Browser B, start the task
4. In Browser A, verify task status updates (without manual refresh)
5. In Browser B, mark items
6. In Browser A, watch progress update

**Expected Results:**
- [ ] Status updates appear automatically in Manager view
- [ ] No manual refresh needed
- [ ] Updates appear within 2-3 seconds
- [ ] No console errors
- [ ] Handles connection loss gracefully

**Pass/Fail:** ___

---

### ✅ Scenario 10: Error Handling

**Steps:**
1. Try submitting form with empty required fields
2. Try submitting form with past date
3. Try accessing task with invalid token
4. Simulate network error (DevTools throttle)
5. Try uploading very large photo
6. Try accessing another org's task

**Expected Results:**
- [ ] Form validation errors in Portuguese
- [ ] Clear error messages (not generic "error")
- [ ] Invalid token: 403/401 error
- [ ] Network error: retry or offline indicator
- [ ] Large file: size validation error
- [ ] Cross-org access: forbidden

**Pass/Fail:** ___

---

## Performance Metrics

### Target KPIs
- Page load: < 2 seconds (p95)
- API response: < 200ms (p95)
- Checklist mark: < 500ms response
- Real-time update: < 3 seconds

### Measurement
```bash
# Check Network tab in DevTools
# Record times for each request

Manager Dashboard load: ___ ms
Task creation POST: ___ ms
Task fetch GET: ___ ms
Checklist update PATCH: ___ ms
Realtime event delivery: ___ ms
```

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iPhone)
- [ ] Chrome Mobile (Android)

**Mobile-Specific Tests:**
- [ ] Touch targets >= 44px
- [ ] Forms responsive
- [ ] No horizontal scroll
- [ ] Keyboard doesn't hide inputs

---

## Security Tests

- [ ] CSRF tokens present in forms
- [ ] XSS: Can't inject HTML in notes field
- [ ] SQL injection: Special chars in inputs safe
- [ ] Auth: Token expires after 7 days
- [ ] Auth: Invalid token rejected
- [ ] CORS: API only accepts staging domain
- [ ] RLS: Manager A can't see Manager B's tasks

---

## Regression Tests

- [ ] Other modules still work (reservations, properties, etc)
- [ ] User login/logout still works
- [ ] Navigation menu still works
- [ ] I18n still works (switch locales)
- [ ] Dark mode still works
- [ ] No console errors on any page

---

## Bug Report Template

```markdown
### Bug Title
[Descriptive title]

### Steps to Reproduce
1. 
2. 
3. 

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Screenshots/Video
[Attach if possible]

### Environment
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux/iOS/Android]
- URL: [staging-lodgra.vercel.app/path]
- User Role: [manager/cleaner/admin]

### Severity
[ ] Critical (blocks usage)
[ ] High (major feature broken)
[ ] Medium (workaround exists)
[ ] Low (minor issue)
```

---

## Sign-off

- **QA Tester Name:** _______________
- **Date:** _______________
- **Overall Status:** 
  - [ ] ✅ PASS — All tests passed, ready for production
  - [ ] ⚠️ PASS WITH NOTES — Minor issues noted (see bug list)
  - [ ] ❌ FAIL — Critical issues found, not ready

- **Total Bugs Found:** ___
  - Critical: ___
  - High: ___
  - Medium: ___
  - Low: ___

---

**Questions?** Contact Morgan (@pm) or Quinn (@qa)
