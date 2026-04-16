# Native Select vs Radix UI Select — Detailed Comparison

## Feature Comparison Matrix

| Feature | Native `<select>` | Radix UI Select 2.2.6 |
|---------|:-:|:-:|
| **Empty Value Support** | ✅ Yes | ❌ No (by design) |
| **Optional Fields** | ✅ Yes | ⚠️ Requires workaround |
| **React 19 Compatible** | ✅ Yes | ⚠️ Partial (known issues) |
| **Custom Styling** | ❌ Limited | ✅ Full control |
| **Searchable** | ❌ No | ✅ Yes (custom) |
| **Multi-select** | ✅ Native support | ✅ Via custom implementation |
| **Grouping** | ✅ `<optgroup>` | ✅ Yes |
| **Keyboard Navigation** | ✅ Full (browser) | ✅ Full (ARIA) |
| **Accessibility (ARIA)** | ✅ Built-in | ✅ Built-in |
| **Bundle Size Impact** | None | +~15KB (gzip) |
| **Dependencies** | None | Requires radix-ui |
| **Styling Consistency** | Browser defaults | Tailwind + custom CSS |
| **Portal Rendering** | ❌ No | ✅ Yes |
| **Positioning Control** | ❌ Browser decides | ✅ Full control |
| **RTL Support** | ✅ Native | ✅ Full |
| **Mobile UX** | ✅ Native picker | ⚠️ Custom implementation |

---

## Code Examples

### Use Case 1: Optional User Assignment (Owner Form)

**❌ FAILS with Radix UI:**
```typescript
// This throws error with Radix UI 2.2.6
<Select value={selectedUserId} onValueChange={setSelectedUserId}>
  <SelectTrigger>
    <SelectValue placeholder="Selecionar..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">Nenhum (pessoa externa)</SelectItem>  {/* ❌ ERROR */}
    {users.map(u => (
      <SelectItem key={u.id} value={u.id}>
        {u.full_name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**✅ WORKS with Native Select:**
```typescript
<select
  value={selectedUserId}
  onChange={(e) => setSelectedUserId(e.target.value)}
>
  <option value="">Nenhum (pessoa externa)</option>  {/* ✅ Works */}
  {users.map(u => (
    <option key={u.id} value={u.id}>
      {u.full_name}
    </option>
  ))}
</select>
```

---

### Use Case 2: Currency Selection (Must Have Default)

**✅ WORKS with Radix UI:**
```typescript
<Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="EUR">EUR - Euro</SelectItem>
    <SelectItem value="BRL">BRL - Real Brasileiro</SelectItem>
    <SelectItem value="USD">USD - Dólar Americano</SelectItem>
  </SelectContent>
</Select>
```

**✅ ALSO WORKS with Native Select:**
```typescript
<select value={preferredCurrency} onChange={(e) => setPreferredCurrency(e.target.value)}>
  <option value="EUR">EUR - Euro</option>
  <option value="BRL">BRL - Real Brasileiro</option>
  <option value="USD">USD - Dólar Americano</option>
</select>
```

---

### Use Case 3: Searchable List (Radix Only)

**❌ NOT POSSIBLE with Native Select:**
```typescript
// Cannot search native select without extra JavaScript
<select>
  <option value="1">Mariana Silva</option>
  <option value="2">João Santos</option>
  <option value="3">Ana Costa</option>
</select>
```

**✅ POSSIBLE with Radix UI (with custom implementation):**
```typescript
// Would require:
// 1. Custom input field with filtering logic
// 2. Radix UI Combobox + Select combination
// 3. Typeahead search implementation
// Total effort: Medium-High
```

---

## Decision Tree

```
┌─ Is this an OPTIONAL field?
│  └─ YES → Use NATIVE SELECT
│           (empty value support needed)
│
│  └─ NO → Does it need custom styling?
│          ├─ YES → Use RADIX UI
│          │         (full design control)
│          │
│          └─ NO → Use either (NATIVE is simpler)
│
│
├─ Does it need searchable/filterable?
│  ├─ YES → Use RADIX UI + custom implementation
│  │         (Combobox pattern)
│  │
│  └─ NO → NATIVE SELECT (simpler)
│
│
└─ Does it need to match design system?
   ├─ YES → Check if design system requires Radix UI
   │         If optional field + Radix required = use encoding workaround
   │
   └─ NO → NATIVE SELECT (most appropriate)
```

---

## Project Implementation Strategy

### Phase 1: Current State (✅ Already Done)
- **Owner form:** Native select for user assignment (optional field)
- **Owner form:** Radix UI for currency (has default)

### Phase 2: Audit Other Selects
Review these components:
- `ExpensesFilter.tsx` — uses Radix UI
- `ReservationsFilter.tsx` — uses Radix UI
- `CalendarPageClient.tsx` — uses Radix UI
- `NewReservationModal.tsx` — uses Radix UI

**For each:** Determine if field is optional
- ✅ Optional? → Consider native select or encoding workaround
- ✅ Required + styled? → Keep Radix UI (works fine)

### Phase 3: Standardization
Decide on pattern for optional selects:
1. **Option A:** Consistently use native select for all optional fields
2. **Option B:** Create `<SelectOptional>` wrapper component with encoding
3. **Option C:** Wait for Radix v3 with better support

**Recommendation:** **Option A** (native select) — simpler, fewer bugs

---

## When to Use Each

### Use Native `<select>` When:
1. Field is optional (can have empty value)
2. List has fewer than 50 items
3. Custom search not needed
4. Mobile defaults acceptable
5. Performance critical (no deps)
6. Consistency with browser UX preferred

**Perfect For:**
- User/property selection
- Country/region dropdowns
- Status filters
- Optional date ranges
- Permission/role selection

### Use Radix UI Select When:
1. Field has default value (always selected)
2. Custom styling required (matches design system)
3. Complex positioning needed (popper pattern)
4. Portal rendering required (overflow containers)
5. Accessibility customization needed
6. Design consistency with other Radix components

**Perfect For:**
- Styled app theme selects
- Currency selection (when default exists)
- Status dropdowns with design requirements
- Components in design system library
- Filtered/searchable lists (requires custom implementation)

---

## Migration Path (If Needed)

### Short Term (Do Now)
```typescript
// Keep current approach
// Owner form: Native select ✅
// Currency: Radix UI ✅
```

### Medium Term (3-6 months)
```typescript
// Monitor Radix UI GitHub for:
// - Issue #2706 resolution (empty value support)
// - Radix v3 announcement
// - React 19 edge case fixes

// If not fixed: Consider creating <SelectOptional>
// component for codebase-wide standardization
```

### Long Term (6+ months)
```typescript
// If Radix v3 released with full support:
// - Evaluate migration effort
// - Update all components
// - Remove workarounds

// If not released:
// - Lock pattern: native for optional, Radix for styled
// - Document decision in architecture guide
// - Continue current approach
```

---

## Bundle Size Impact

| Package | Size (gzip) | Included |
|---------|:----------:|:--------:|
| Native select | 0 KB | Built into browser |
| radix-ui | ~45 KB | Already in project |
| @radix-ui/react-select | ~15 KB | Already in project |

**Current State:** No change needed. Radix UI already included for other components.

---

## Conclusion

The owner form is using the **optimal, production-ready solution:**

- **User select:** Native `<select>` (appropriate for optional field)
- **Currency select:** Radix UI (styled, has default)

This hybrid approach is the best practice for Next.js + Tailwind + Radix UI projects. Continue this pattern for other optional form fields.

**No action required.**
