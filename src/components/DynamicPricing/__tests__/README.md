# Story 36.11b — Jest Test Suite Setup Guide

## 📋 Overview

This directory contains Jest test templates for Story 36.11b Dynamic Pricing UI components. Tests are pre-structured and ready for @dev to implement.

**Test Coverage:**
- `RuleBuilder.test.tsx` — 12 test cases (~60 lines of test code)
- `DryRunPreview.test.tsx` — 17 test cases (~70 lines of test code)  
- `AuditLog.test.tsx` — 28 test cases (~85 lines of test code)

**Total:** ~57 test cases, ~700 LOC

---

## 🚀 Quick Start

### 1. Install Dependencies (if not already installed)

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run only DynamicPricing tests
npm test -- DynamicPricing

# Run specific test file
npm test -- RuleBuilder.test.tsx

# Watch mode
npm test -- --watch
```

### 3. Generate Coverage Report

```bash
npm test -- --coverage DynamicPricing
```

---

## 📝 Test Files Structure

### RuleBuilder.test.tsx

**Tests pre-built templates, form validation, condition/action types**

Organized into 7 describe blocks:
- **Templates:** Template display, application
- **Form Validation:** Required field validation, form submission
- **Condition Types:** Selecting different condition types, value validation
- **Action Types:** Support for increase_percent, decrease_percent, set_price
- **Priority:** Accepts 1-10 range
- **Enabled State:** Toggle enabled/disabled state
- **Modal Control:** Close button, form submission close

**Key test cases to ensure:**
```
✓ 4 templates display correctly
✓ Template application works
✓ Name field is required
✓ Valid submission triggers onCreateRule
✓ Condition type selection works
✓ Action type selection works
✓ Priority slider accepts 1-10
✓ Enabled checkbox toggles
✓ Cancel closes modal
✓ Form submission closes modal
✓ Error handling shows toast
```

---

### DryRunPreview.test.tsx

**Tests dry-run simulation, price changes, revenue impact, apply/discard**

Organized into 8 describe blocks:
- **Summary Statistics:** Total nights, increases, decreases, revenue impact
- **Price Changes Table:** Display, percentage formatting, truncation
- **Apply Changes:** Button click, success/error toasts, disable during loading
- **Discard Changes:** Button click behavior
- **Warning:** Displays preview warning message
- **Empty State:** Handles empty price changes
- **Loading State:** Button state during async operation

**Key test cases to ensure:**
```
✓ Total nights counted correctly
✓ Increases counted correctly
✓ Decreases counted correctly
✓ Revenue impact displayed (positive/negative)
✓ Price changes display in table
✓ Percentage changes formatted correctly
✓ Decrease with negative symbol
✓ Table truncates to 15 rows max
✓ Apply button triggers onApply
✓ Success toast on apply
✓ Error toast on apply failure
✓ Apply button disabled while loading
✓ Discard button calls onDiscard
✓ Warning message displays
✓ Empty state handled
✓ Loading state updates button text
```

---

### AuditLog.test.tsx

**Tests audit log display, filtering, sorting, CSV export**

Organized into 10 describe blocks:
- **Display:** Heading, entries in table, empty state
- **Summary Statistics:** Total, manual, automated counts
- **Date Range Filtering:** Today, 7d, 30d, all-time options
- **Type Filtering:** Manual, automated, all filters
- **Sorting:** Most recent first (descending)
- **Price Display:** EUR formatting, percentage changes
- **Type Badges:** Manual/Automática badge display
- **CSV Export:** Export button, success/error handling, blob creation
- **Data Retention:** Displays 1-year retention note
- **Filter Combination:** Both filters applied simultaneously

**Key test cases to ensure:**
```
✓ Heading displays
✓ All entries show in table
✓ Empty state message shows
✓ Total count displays
✓ Manual count displays
✓ Automated count displays
✓ Date filter dropdown present
✓ Date filters apply correctly
✓ Type filter dropdown present
✓ Type filters apply correctly
✓ Entries sorted by date (descending)
✓ Prices formatted with EUR
✓ Percentage changes display
✓ Negative changes display
✓ Manual badge displays
✓ Automática badge displays
✓ Export button present
✓ Export success toast
✓ Export error toast
✓ Blob created for download
✓ Retention note displays
✓ Multiple filters work together
```

---

## 🔧 Implementation Checklist

Use this checklist as you implement the test suite:

### Setup Phase
- [ ] Mock dependencies (sonner toast, window.URL)
- [ ] Define mock props and return values
- [ ] Set up beforeEach cleanup

### RuleBuilder Tests
- [ ] Templates tests (display, application)
- [ ] Form validation tests (required name, valid submission)
- [ ] Condition type tests (selection, validation)
- [ ] Action type tests (increase_percent, decrease_percent, set_price)
- [ ] Priority tests (range validation 1-10)
- [ ] Enabled state tests (toggle checkbox)
- [ ] Modal control tests (close button, auto-close on submit)
- [ ] Error handling tests (API error toast)

### DryRunPreview Tests
- [ ] Summary stats tests (total, increases, decreases, revenue impact)
- [ ] Price change table tests (display, percentage, decimals)
- [ ] Apply button tests (trigger onApply, success/error toast, loading state)
- [ ] Discard button tests (trigger onDiscard)
- [ ] Warning message tests (preview notice)
- [ ] Empty state tests (no changes)
- [ ] Loading state tests (button text change)

### AuditLog Tests
- [ ] Display tests (heading, table, empty state)
- [ ] Summary stats tests (total, manual, automated)
- [ ] Date filter tests (today, 7d, 30d, all)
- [ ] Type filter tests (manual, automated, all)
- [ ] Sorting tests (date descending)
- [ ] Price display tests (EUR format, percentages)
- [ ] Badge tests (Manual, Automática)
- [ ] CSV export tests (button, success/error, blob)
- [ ] Retention note test (1-year note)
- [ ] Combined filter tests (both filters)

---

## 📊 Success Criteria

Once implemented, verify:

```bash
# All tests pass
npm test -- DynamicPricing

# Coverage is adequate (aim for >80% on components)
npm test -- --coverage DynamicPricing

# No TypeScript errors
npm run typecheck

# No lint issues
npm run lint
```

Expected output:
```
Test Suites: 1 passed, 1 total
Tests: 57 passed, 57 total
Snapshots: 0 total
Time: ~5-10s
```

---

## 🎯 Testing Tips

1. **Use waitFor for async operations:**
   ```typescript
   await waitFor(() => {
     expect(mockOnApply).toHaveBeenCalled();
   });
   ```

2. **Mock dependencies at the top:**
   ```typescript
   jest.mock('sonner');
   global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
   ```

3. **Use userEvent over fireEvent:**
   ```typescript
   await userEvent.click(button); // Better than fireEvent.click
   ```

4. **Reset mocks between tests:**
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

5. **Test user perspective, not implementation details**

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Mock toast not working | Add `jest.mock('sonner')` at top of file |
| URL.createObjectURL not defined | Mock globally in beforeEach |
| userEvent not typing | Use `await userEvent.type()` |
| Component not rendering | Check all required props passed |
| Async test timeout | Increase timeout with `waitFor(..., { timeout: 5000 })` |

---

## ⏱️ Estimated Implementation Time

- **Setup & mocks:** 30 min
- **RuleBuilder tests:** 1-1.5 hours
- **DryRunPreview tests:** 1-1.5 hours
- **AuditLog tests:** 1.5-2 hours
- **Verification & fixes:** 30 min

**Total:** ~4-6 hours

---

## 📝 Notes for @dev

- All test templates are pre-structured; you mainly need to implement the assertions
- Use the existing test patterns in the codebase as reference
- Run tests frequently during implementation to catch issues early
- Don't hesitate to refactor tests for clarity
- Once passing, these tests will prevent regressions in future updates

---

**QA Review:** Tests ready for implementation. Expected completion by end of day.

— Quinn (@qa) 🛡️
