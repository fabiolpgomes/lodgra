# Radix UI + React 19 SelectItem Error — Quick Reference

## The Problem
Owner edit page (`/owners/[id]/edit/page.tsx`) throws error when trying to use Radix UI Select with empty values:
> "A SelectItem /> must have a value prop that is not an empty string"

## Root Cause
- **Not a React 19 bug** — affects React 18 equally
- **Radix UI v2.2.6 design constraint** — no newer v2.x available
- **By design:** Empty string reserved for "clear selection" state

---

## Top 3 Solutions

### 🥇 SOLUTION 1: Keep Native HTML Select (RECOMMENDED)

**Status:** ✅ Already implemented in codebase

```typescript
// /src/app/owners/[id]/edit/page.tsx (lines 260-273)
<select
  id="user_id"
  value={selectedUserId}
  onChange={(e) => setSelectedUserId(e.target.value)}
>
  <option value="">Nenhum (pessoa externa)</option>
  {users.map((u) => (
    <option key={u.id} value={u.id}>
      {u.full_name || u.email}
    </option>
  ))}
</select>
```

**Pros:**
✅ Works perfectly with empty values
✅ Zero dependencies
✅ Accessible (browser-handled)
✅ No version conflicts
✅ Already in production

**Cons:**
- Limited styling customization (browser default)
- No custom features (search, filtering)

**Effort:** None (already done)
**Risk:** None
**Recommendation:** **USE THIS** ✅

---

### 🥈 SOLUTION 2: Upgrade Radix UI (Won't Help)

**Current:** `@radix-ui/react-select@2.2.6`
**Latest:** `@radix-ui/react-select@2.2.6` (no newer version)

**Status:** ❌ No new release available

Radix UI consolidated to single `radix-ui@1.4.3` package. No v2.3.x planned. The empty-value constraint remains.

**Recommendation:** **DON'T UPGRADE** — no benefit

---

### 🥉 SOLUTION 3: Downgrade React 19 → React 18

**Current:** React 19.2.3
**Target:** React 18.3.1

**Status:** ❌ CRITICAL RISKS

Would break:
- ❌ `@react-pdf/renderer@4.3.2` (currently invalid for React 18)
- ❌ `@testing-library/react@15.0.7` (broken with downgrade)
- ❌ Test infrastructure
- ❌ PDF exports feature

**Recommendation:** **DO NOT DOWNGRADE** ❌

---

## Decision Table

| Solution | Works? | Risk | Effort | Recommended |
|----------|:------:|:----:|:------:|:-----------:|
| Native Select (current) | ✅ | None | 0 | **✅✅✅** |
| Upgrade Radix UI | ❌ | Low | 5 min | ❌ |
| Downgrade React 18 | ✅ | CRITICAL | High | ❌❌ |

---

## Action Items

### Immediate (Now)
- ✅ No action required — current implementation is optimal
- ✅ Consider native select for other optional form fields

### Monitor (Next 3 months)
- Watch Radix UI GitHub for v2.3.x or v3 announcement
- Review if React 19 edge cases get fixed (issues #2706, #3295)

### Future (6+ months)
- Plan Radix UI v3 migration if/when released
- shadcn/ui completing full React 19 refresh (June 2025 timeline)

---

## Key Takeaway

**The owner form is already using the best solution.** No changes needed. Native HTML select is the correct choice for optional form fields with Radix UI used elsewhere for styled components with default values.

---

**Document:** `/Users/fabiogomes/Projetos/home-stay/RADIX_REACT19_ANALYSIS.md` (full detailed report)
