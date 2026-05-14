# QA Fix Request — Global Search Feature

**Generated:** 2026-05-14T07:52:31Z  
**Feature:** feat(search): implement global search with modal interface  
**Commit:** 9756d76  
**Status:** ⚠️ CONCERNS — 3 Critical Security Issues Blocking Merge  
**Reviewer:** Quinn (QA Agent)  

---

## Executive Summary

The global search implementation is feature-complete but has **3 critical security issues** and **6 accessibility issues** that must be fixed before merge.

**Critical Issues (Blocking):**
- Missing authentication — endpoint accessible to unauthenticated users
- SQL injection vulnerability — query parameters not escaped in LIKE patterns
- Race condition — concurrent requests can return stale results

**Accessibility Issues (Required for compliance):**
- Missing ARIA attributes on modal dialog
- Missing ARIA labels on interactive elements

**Quality Issues (Recommended fixes):**
- Missing HTTP status validation
- Missing request timeout
- Hardcoded type filtering
- Misleading role defaults

---

## Critical Issues (MUST FIX)

### 1. 🔒 Missing Authentication — Unauthenticated Data Access

**File:** `src/app/api/search/global/route.ts`  
**Lines:** 23-24, 60  
**Severity:** 🔴 CRITICAL  
**Risk:** Unauthenticated users can search and retrieve sensitive data (PII, financial info, owner contacts)

**Current Code:**
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  // ...
  const supabase = createAdminClient()  // ← No auth check
```

**Fix:**
```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // 1. Add authentication check
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  
  if (!q || q.length < 2 || q.length > 200) {
    return NextResponse.json({ results: [] })
  }

  // 2. Use RLS-aware client instead of admin client
  // NOTE: Remove createAdminClient() calls and use the authenticated supabase client
  // This ensures Row Level Security policies apply to all queries
```

**Why:** Without auth, the endpoint is public. Anyone can enumerate your database.

---

### 2. 🗡️ SQL Injection — LIKE Pattern Not Escaped

**File:** `src/app/api/search/global/route.ts`  
**Lines:** 27-45, 48-52, 79, 102  
**Severity:** 🔴 CRITICAL  
**Risk:** Attackers can craft queries with `%`, `_`, `\` to bypass pattern matching or cause performance issues

**Current Code:**
```typescript
const { data: properties } = await supabase
  .from('properties')
  .select('id, name, city, currency')
  .ilike('name', `%${q}%`)  // ← Raw interpolation, unsafe
  .limit(5)
```

**Fix:**
```typescript
// Add escape function at top of file
function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&')
}

// Apply to all searches:
const { data: properties } = await supabase
  .from('properties')
  .select('id, name, city, currency')
  .ilike('name', `%${escapeLikePattern(q)}%`)  // ✅ Escaped
  .limit(5)

// REPEAT FOR:
// - Line 51: reservations ilike query
// - Line 79: expenses ilike query
// - Line 102: owners ilike query
```

**Why:** LIKE metacharacters have special meaning in SQL. Escaping prevents injection.

---

### 3. 🔄 Race Condition — Stale Results from Concurrent Requests

**File:** `src/hooks/useGlobalSearch.ts`  
**Lines:** 29-50  
**Severity:** 🔴 CRITICAL  
**Risk:** If user types quickly (e.g., "a" then "ab" then "abc"), earlier requests can complete after later ones, showing stale results

**Current Code:**
```typescript
const search = useCallback(async (q: string) => {
  if (!q.trim() || q.length < 2) {
    setState(prev => ({ ...prev, results: [], query: q }))
    return
  }

  setState(prev => ({ ...prev, query: q, isLoading: true }))

  try {
    const res = await fetch(`/api/search/global?q=${encodeURIComponent(q)}`)
    const data = await res.json()

    setState(prev => ({
      ...prev,
      results: data.results || [],
      isLoading: false,
    }))
  } catch (error) {
    console.error('[Global Search] Error:', error)
    setState(prev => ({ ...prev, results: [], isLoading: false }))
  }
}, [])
```

**Fix:**
```typescript
const debounceTimer = useRef<NodeJS.Timeout | null>(null)
const abortController = useRef<AbortController | null>(null)  // ← Add this

const search = useCallback(async (q: string) => {
  if (!q.trim() || q.length < 2) {
    setState(prev => ({ ...prev, results: [], query: q }))
    return
  }

  // Cancel previous request
  if (abortController.current) {
    abortController.current.abort()
  }
  abortController.current = new AbortController()

  setState(prev => ({ ...prev, query: q, isLoading: true }))

  try {
    const timeoutMs = 10000
    const timeoutId = setTimeout(() => abortController.current?.abort(), timeoutMs)
    
    const res = await fetch(`/api/search/global?q=${encodeURIComponent(q)}`, {
      signal: abortController.current.signal  // ← Use abort signal
    })

    clearTimeout(timeoutId)

    if (!res.ok) {  // ← Add status check
      throw new Error(`Search failed with status ${res.status}`)
    }

    const data = await res.json()

    setState(prev => ({
      ...prev,
      results: data.results || [],
      isLoading: false,
    }))
  } catch (error) {
    // Don't update state if request was aborted
    if (error instanceof Error && error.name === 'AbortError') {
      return
    }
    console.error('[Global Search] Error:', error)
    setState(prev => ({ ...prev, results: [], isLoading: false }))
  }
}, [])

// Update cleanup in useEffect
useEffect(() => {
  return () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    if (abortController.current) {
      abortController.current.abort()
    }
  }
}, [])

// Update handleClear to cancel pending requests
const handleClear = useCallback(() => {
  if (debounceTimer.current) {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = null
  }
  if (abortController.current) {
    abortController.current.abort()
  }
  setState({
    query: '',
    results: [],
    isLoading: false,
    isOpen: false,
  })
}, [])
```

**Why:** AbortController cancels stale requests, preventing out-of-order results.

---

## Major Issues (MUST FIX for Accessibility & Security)

### 4. ♿ Missing ARIA Attributes — Modal Dialog

**File:** `src/components/common/search/SearchModal.tsx`  
**Lines:** 58-62  
**Severity:** 🟠 MAJOR  
**Impact:** Screen readers cannot identify the modal, violates WCAG 2.1 AA

**Fix:**
```typescript
<div
  className="w-full max-w-2xl mx-4 bg-white rounded-xl shadow-xl overflow-hidden"
  onClick={e => e.stopPropagation()}
  role="dialog"                                    // ← Add
  aria-modal="true"                               // ← Add
  aria-label="Buscar propriedades, reservas, despesas e proprietários"  // ← Add
>
```

---

### 5. ♿ Missing ARIA Label — Search Input

**File:** `src/components/common/search/SearchModal.tsx`  
**Lines:** 67-74  
**Severity:** 🟠 MAJOR

**Fix:**
```typescript
<input
  ref={inputRef}
  type="text"
  value={query}
  onChange={e => onQueryChange(e.target.value)}
  placeholder="Pesquisar propriedades, reservas, despesas, proprietários..."
  className="flex-1 text-lg outline-none text-[#1E3A8A] placeholder:text-[#1E3A8A]/40"
  aria-label="Buscar propriedades, reservas, despesas, proprietários"  // ← Add
/>
```

---

### 6. ♿ Missing ARIA Label — Close Button

**File:** `src/components/common/search/SearchModal.tsx`  
**Lines:** 76-81  
**Severity:** 🟠 MAJOR

**Fix:**
```typescript
<button
  onClick={onClose}
  className="p-1 text-[#1E3A8A]/40 hover:text-[#1E3A8A] transition-colors"
  aria-label="Fechar busca"  // ← Add
>
  <X className="h-5 w-5" />
</button>
```

---

### 7. 🛡️ Missing HTTP Status Check

**File:** `src/hooks/useGlobalSearch.ts`  
**Lines:** 38-39  
**Severity:** 🟠 MAJOR

Already covered in Fix #3 above (search function). Ensure `if (!res.ok)` check is present.

---

### 8. ⏱️ Missing Request Timeout

**File:** `src/hooks/useGlobalSearch.ts`  
**Lines:** 38  
**Severity:** 🟠 MAJOR

Already covered in Fix #3 above (search function with 10-second timeout).

---

### 9. 🔍 Inefficient Search — ID Query Using LIKE

**File:** `src/app/api/search/global/route.ts`  
**Lines:** 48-52  
**Severity:** 🟠 MAJOR

**Current:**
```typescript
const { data: reservations } = await supabase
  .from('reservations')
  .select('id, property_listings(properties(name)), guests(first_name, last_name), check_in')
  .ilike('id', `%${q}%`)  // ← Inefficient for IDs
  .limit(5)
```

**Better approach — search guest names instead:**
```typescript
// Option 1: Search by guest name (more user-friendly)
const { data: reservations } = await supabase
  .from('reservations')
  .select('id, property_listings(properties(name)), guests(first_name, last_name), check_in')
  .or(`guests.first_name.ilike.%${escapeLikePattern(q)}%,guests.last_name.ilike.%${escapeLikePattern(q)}%`)
  .limit(5)

// Option 2: If exact ID match is needed
if (q.match(/^[a-f0-9-]{36}$/)) {  // UUID format check
  const { data: reservations } = await supabase
    .from('reservations')
    .select('...')
    .eq('id', q)
    .limit(5)
}
```

---

### 10. 👤 PII Exposure — Owner Emails

**File:** `src/app/api/search/global/route.ts`  
**Lines:** 98-117  
**Severity:** 🟠 MAJOR (Amplified by missing auth)

**Fix:** Remove email from results, or mask it:
```typescript
if (owners) {
  results.push(
    ...owners.map(o => ({
      id: o.id,
      type: 'owner' as const,
      title: o.full_name,
      // ✗ REMOVE: subtitle: o.email,
      // ✓ BETTER: Don't expose PII without explicit user consent
      href: `/owners/${o.id}`,
      icon: '👤',
    }))
  )
}
```

---

### 11. 🔒 Missing Max Length Validation

**File:** `src/app/api/search/global/route.ts`  
**Lines:** 15-21  
**Severity:** 🟠 MAJOR (DoS Risk)

**Fix:**
```typescript
export async function GET(request: NextRequest) {
  // ... auth checks from Fix #1 ...

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  const MAX_QUERY_LENGTH = 200

  if (!q || q.length < 2 || q.length > MAX_QUERY_LENGTH) {  // ← Add max length
    return NextResponse.json({ results: [] })
  }
```

---

### 12. 🔄 Hardcoded Result Types

**File:** `src/components/common/search/SearchModal.tsx`  
**Lines:** 102-104  
**Severity:** 🟠 MAJOR (Maintenance issue)

**Current:**
```typescript
{['property', 'reservation', 'expense', 'owner'].map(type => {
  const typeResults = results.filter(r => r.type === type)
```

**Better — Dynamic extraction:**
```typescript
const TYPE_ORDER = ['property', 'reservation', 'expense', 'owner'] as const

// Get unique types from results, maintaining order
const uniqueTypes = Array.from(new Set(results.map(r => r.type)))
  .sort((a, b) => {
    const aIndex = TYPE_ORDER.indexOf(a)
    const bIndex = TYPE_ORDER.indexOf(b)
    return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex)
  })

{uniqueTypes.map(type => {
  const typeResults = results.filter(r => r.type === type)
```

---

## Minor Issues (Recommended Fixes)

### 13. 🟡 Misleading Role Fallback

**File:** `src/components/common/layout/Sidebar.tsx`  
**Line:** 158

**Current:**
```typescript
{profile?.role || 'admin'}
```

**Better:**
```typescript
{profile?.role || 'user'}
```

**Why:** Defaulting to 'admin' confuses users about their permissions.

---

### 14. 🟡 Sanitize Error Logging

**File:** `src/app/api/search/global/route.ts`  
**Lines:** 120-123

**Current:**
```typescript
} catch (error) {
  console.error('[Global Search] Error:', error)
  return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 })
}
```

**Better:**
```typescript
} catch (error) {
  console.error('[Global Search] Error:', error instanceof Error ? error.message : 'Unknown error')
  return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 })
}
```

**Why:** Prevents exposing stack traces, DB connections, etc. in logs.

---

### 15. 🟡 Missing Debounce Timer Cleanup

**File:** `src/hooks/useGlobalSearch.ts`  
**Lines:** 75-82

Already covered in Fix #3 (handleClear should cancel timer).

---

## Validation Checklist

After implementing fixes, verify:

- [ ] **Authentication:** Endpoint returns 401 for unauthenticated requests
- [ ] **SQL Injection:** Query with `%` or `_` characters doesn't break queries
- [ ] **Race Condition:** Type "test" quickly, stale results don't appear
- [ ] **ARIA:** Screen reader reads modal as "dialog" with proper labels
- [ ] **HTTP Status:** Non-200 responses handled gracefully
- [ ] **Timeout:** No requests hang > 10 seconds
- [ ] **PII:** No email addresses exposed in results
- [ ] **Build:** `npm run build` passes
- [ ] **Tests:** `npm test` passes
- [ ] **CodeRabbit:** Final review shows 0 CRITICAL/HIGH issues

---

## Implementation Priority

1. **Phase 1 — Critical Security (Block Merge):**
   - Fix #1: Add authentication
   - Fix #2: Escape SQL patterns
   - Fix #3: Cancel stale requests

2. **Phase 2 — Accessibility (Required for Launch):**
   - Fix #4-6: Add ARIA attributes
   - Fix #13: Fix role default

3. **Phase 3 — Quality (Nice to Have):**
   - Fix #7-12, 14-15: Remaining issues

---

## Next Steps

1. Implement all Critical and Major fixes
2. Run `npm run build` and `npm test`
3. Run `coderabbit review --plain` again to verify
4. Return for QA re-review when ready

**Estimated Time:** 2-3 hours  
**Complexity:** High (security-sensitive)  

---

**Generated by:** Quinn (QA Agent)  
**Date:** 2026-05-14  
**Status:** Awaiting @dev implementation
