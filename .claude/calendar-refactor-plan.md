# Calendar Refactor Plan - ISO 8601 Week Numbering

## Problem Statement

**Current Issues:**
1. Calendar renders **blank on first load** - no reservation bars visible
2. **Reservation dates are wrong** - bars appear in incorrect positions
3. **Navigation broken** - clicking arrows causes visual glitches
4. Simple `weekIndex = floor(dayIndex / 7)` doesn't map correctly to actual dates

**Root Cause:**
The calendar uses a naive week indexing system (0, 1, 2, ...) that doesn't correspond to real ISO 8601 weeks. This causes:
- Scroll position calculations to be wrong (601px per week is incorrect for actual date mapping)
- Reservation bar positioning to diverge from displayed dates
- First render timing issues (refs not ready, scroll not set)

## Solution: ISO 8601 Week Numbering

**Standard:** ISO 8601 week numbering (international standard)
- Week 1 = first week with Thursday in it (or ≥4 days in January)
- Week starts on Monday
- Years can have 52 or 53 weeks
- 2026 has 53 weeks

**Benefits:**
- ✅ Correct date-to-week mapping
- ✅ Matches international standards
- ✅ Eliminates scroll position bugs
- ✅ Simpler logic (no magic pixel numbers)

## Implementation Plan (Session Tomorrow)

### Phase 1: Setup (5 min)
- ✅ Already created: `src/utils/weekUtils.ts` with ISO 8601 functions:
  - `getISOWeekNumber(date)` - Get week number 1-53
  - `getISOWeekStartDate(year, week)` - Get Monday of week
  - `getWeekDays(date)` - Get array of 7 days in week

### Phase 2: Refactor CalendarKanbanView (45 min)

**Replace this logic:**
```javascript
// ❌ OLD: Simple index-based weeks
const baseDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
const allDays = Array.from({ length: 180 }, (_, i) => {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + i)
  return date
})
const initialWeekIndex = todayIndex >= 0 ? Math.floor(todayIndex / 7) : 13
```

**With this:**
```javascript
// ✅ NEW: ISO 8601 week-based
import { getISOWeekNumber, getWeekDays } from '@/utils/weekUtils'

const todayWeekNumber = getISOWeekNumber(now)
const [currentWeek, setCurrentWeek] = useState(todayWeekNumber)
const weekDays = getWeekDays(new Date(now.getFullYear(), 0, 4)) // Get days for current week
```

**Changes needed:**
1. Remove `allDays` array (180 days) - only generate 7 days per week
2. Remove complex scroll position calculations (601px, etc.)
3. Remove `useEffect`/`useLayoutEffect` for scroll sync - not needed!
4. Simplify reservation bar positioning - use actual dates, not indices
5. Update `handleWeekNavigation` to increment/decrement week numbers (1-53)

### Phase 3: Update ReservationBar Positioning (15 min)

**Current:**
```javascript
const leftOffset = dayStartIndex * (cellWidth + cellGap)
```

**New (using actual dates):**
```javascript
const weekDays = getWeekDays(new Date(reservation.startDate.getFullYear(), 0, 4))
const dayInWeekIndex = weekDays.findIndex(d => d.toDateString() === startDate.toDateString())
const leftOffset = Math.max(0, dayInWeekIndex * (cellWidth + cellGap))
```

### Phase 4: Testing (20 min)

**Test cases:**
- [ ] Open calendar → shows July 25-31 week with today highlighted
- [ ] Reservation bars visible immediately on load
- [ ] Check-in 20/7 shows on day 20, check-out 26/7 shows on day 25
- [ ] Click right arrow → shows Aug 1-7 week
- [ ] Click left arrow → shows July 18-24 week
- [ ] All 79 reservation bars visible at correct dates
- [ ] No blank renders
- [ ] No off-screen bars

## Files to Modify

1. **src/utils/weekUtils.ts** ← ✅ Already created
2. **src/components/calendar/CalendarKanbanView.tsx** ← Main refactor
3. **src/components/calendar/ReservationBar.tsx** ← Update positioning logic

## Commits Tomorrow

1. `refactor: use ISO 8601 week numbering for calendar`
2. `fix: calculate reservation bar positions from actual dates`
3. `fix: remove scroll position bugs - use week-based navigation`

## Notes

- No changes to styling (CSS is fine)
- No changes to data fetching (API stays same)
- No changes to UI layout (7 columns for 7 days)
- Pure logic refactor

---

**Status:** 🟡 IN PROGRESS (utilities ready, component refactor pending)
**Assigned to:** Tomorrow session
