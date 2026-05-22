# Decision Log — Story 29.3 Polish Sprint

**Date:** 2026-05-22  
**Mode:** YOLO (Autonomous)  
**Tasks:** 3 (Button Height, Assign Cleaner, Tests)

## Task 1: Button Height Fix ✅

**Status:** COMPLETE

**Changes:**
- TaskForm: buttons now use `size="lg"` (h-10 = 40px)
- TaskFilters: reset button now uses `size="lg"` (h-10 = 40px)
- TaskTable: action buttons remain `size="sm"` for compact layout
- Improves touch targets accessibility per QA concern

**Files Modified:**
- src/components/cleaning/TaskForm.tsx
- src/components/cleaning/TaskFilters.tsx

---

## Task 2: Assign Cleaner Inline Action ✅

**Status:** COMPLETE

**Changes:**
- Added "Assign Cleaner" button to TaskTable actions column
- Clicking button reveals dropdown with cleaner selection
- Dropdown loads from `/api/users?type=cleaner`
- On selection, sends PATCH to `/api/cleaning/tasks/[id]` with cleaner_id
- Confirmation/cancel buttons for UX clarity
- Optimistic update on success

**Feature Details:**
- State management: `assigningTaskId`, `selectedCleanerId`, `cleaners` array
- Fetch cleaners on component mount
- Modal-style inline dropdown (blue background)
- Closes on confirm or cancel
- Calls `onUpdate` callback for parent refresh

**Files Modified:**
- src/components/cleaning/TaskTable.tsx (+155 lines)

---

## Task 3: i18n Translations ✅

**Status:** COMPLETE

**New Keys Added:**
- `table.assign_cleaner` — "Atribuir Responsável" (PT) / "Assign Cleaner" (EN) / "Asignar Responsable" (ES)
- `table.assign` — Confirm button label
- `table.select_cleaner` — Dropdown placeholder
- `table.cancel` — Cancel button (reuse of existing)
- `table.assign_error` — Error message

**Files Modified:**
- src/locales/pt-BR/cleaning.json
- src/locales/en-US/cleaning.json
- src/locales/es/cleaning.json

---

## Task 4: Unit Tests ✅

**Status:** COMPLETE

**Test Files Created:**
- src/__tests__/components/cleaning/TaskTable.test.tsx (assign cleaner logic)
- src/__tests__/components/cleaning/TaskButtons.test.tsx (button height accessibility)

**Test Coverage:**
- Renders task table with correct columns
- Shows "Assign Cleaner" button
- Opens dropdown on button click
- Selects cleaner and calls onUpdate
- Button height verification (h-10 class presence)

---

## Build Status

**npm run build:** Pending (next process lock detected, waiting for completion)

**npm run lint:** ✅ PASS

---

## Next Steps

1. Wait for build to complete
2. Run tests: `npm run test -- --testPathPattern=cleaning`
3. Deploy to Vercel
4. Update story changelog
5. Mark tasks complete in story file

---

**Decision Log ID:** polish-29.3-2026-05-22-yolo
