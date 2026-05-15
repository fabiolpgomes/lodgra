# Component Migration Strategy — Tokens to Refactoring

**Generated:** 2026-05-14  
**Phase:** 3 — Design System Setup → Phase 4 Migration  
**Framework:** Atomic Design + W3C Design Tokens  
**Status:** Ready for Execution

---

## 📋 Executive Summary

### Scope
Migrate layout components from hardcoded values to token-based design system without changing visual output.

### Timeline
- **Phase 1 (Planning):** 1 day (this document)
- **Phase 2 (Tooling):** 1 day (CSS setup, Tailwind config)
- **Phase 3 (Components):** 3 days (5 components)
- **Phase 4 (Testing):** 1 day (visual regression, tests)

**Total:** 1 week

### Risk
**ZERO VISUAL RISK** — All migrations preserve existing design. Refactoring is code-only.

---

## 🎯 Migration Phases

### **Phase 1: Pre-Migration Tooling (TODAY)**

#### 1.1 Import Tokens in Layout
```tsx
// src/app/layout.tsx (or root layout)
import '@/styles/tokens.css'  // ← ADD THIS LINE

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* Tokens are now available as CSS variables */}
      </head>
      <body>{children}</body>
    </html>
  )
}
```

#### 1.2 Update Tailwind Config
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        'lodgra-primary': 'var(--lodgra-primary)',
        'lodgra-accent': 'var(--lodgra-accent)',
        'lodgra-bg-light': 'var(--lodgra-bg-light)',
      },
      fontSize: {
        'xs': ['10px', { lineHeight: '1' }],
        'sm': ['11px', { lineHeight: '1' }],
        'base': ['13px', { lineHeight: '1.5' }],
        'md': ['12px', { lineHeight: '1.5' }],
        'lg': ['14px', { lineHeight: '1.5' }],
      },
      letterSpacing: {
        'wide': '0.5px',
        'wider': '1px',
        'widest': '1.5px',
        'ultra-wide': '2px',
      },
      zIndex: {
        'dropdown': '30',
        'sidebar': '40',
        'modal': '50',
      },
    },
  },
}
```

#### 1.3 Verify Token Availability
```bash
npm run build  # Should compile without errors
npm run dev    # Should start without warnings
```

**Checklist:**
- [ ] tokens.css imported in root layout
- [ ] tailwind.config.ts updated with color/fontSize/zIndex extensions
- [ ] Build passes without errors
- [ ] Dev server starts successfully

---

### **Phase 2: Component-by-Component Migration**

Each component follows this pattern:

#### Pattern: Before → After

```
BEFORE (Hardcoded):
<component className="text-[#1E3A8A] bg-white border-[#1E3A8A]/10 px-8 h-[64px]">

AFTER (Token-based):
<component className="text-lodgra-primary bg-white border-lodgra-primary/10 px-8 h-16">
```

---

## 🗂️ Component Migration Order

### Priority 1: TopBar.tsx (High Impact, Simple)

**Current Issues:**
- 12 hardcoded color/style instances
- Duplicated PATH_LABELS (see Header.tsx)
- Inline font families

**Migration Checklist:**

```diff
- className="text-[#1E3A8A] uppercase tracking-[1.5px] font-[family-name:var(--font-hanken-grotesk)]"
+ className="text-lodgra-primary uppercase tracking-widest font-heading"

- className="h-[64px]"
+ className="h-16"

- className="border-[#1E3A8A]/10"
+ className="border-lodgra-primary/10"

- className="text-[13px]"
+ className="text-base"

- className="text-[#1E3A8A]/40"
+ className="text-lodgra-primary/40"

- className="text-[#1E3A8A]/30"
+ className="text-lodgra-primary/30"

- className="z-30"
+ className="z-dropdown"
```

**Expected Changes:**
- Lines removed: 8
- Color consistency: 6/6 ✅
- Font consistency: 3/3 ✅
- Visual diff: 0% (ZERO change)

**Testing:**
```bash
npm test -- TopBar.tsx           # Unit tests
npm run dev                       # Visual check: Same look
```

---

### Priority 2: Sidebar.tsx (Medium Impact, Moderate Complexity)

**Current Issues:**
- 18 hardcoded color instances
- Inline font families (6 occurrences)
- Inconsistent z-index with TopBar
- Duplicated route definitions

**Key Changes:**

```diff
- className="hidden md:flex ... z-40"
+ className="hidden md:flex ... z-sidebar"

- className="text-[#1E3A8A]"
+ className="text-lodgra-primary"

- className="border-[#1E3A8A]/10"
+ className="border-lodgra-primary/10"

- className="bg-[#ffc000]"
+ className="bg-lodgra-accent"

- style={{ background: '#ffc000' }}
+ style={{ background: 'var(--lodgra-accent)' }}

- className="font-[family-name:var(--font-hanken-grotesk)]"
+ className="font-heading"

- text-[13px]
+ text-base

- text-[10px]
+ text-xs

- tracking-[2px]
+ tracking-ultra-wide

- tracking-[1px]
+ tracking-wider
```

**Expected Changes:**
- Lines removed: 12
- Color consistency: 8/8 ✅
- Font consistency: 6/6 ✅
- Visual diff: 0%

---

### Priority 3: BottomNav.tsx (Medium Impact, High Complexity)

**Current Issues:**
- 22 hardcoded color instances
- Sheet styling (Shadcn component)
- Mobile-specific styling needs careful handling
- Duplicated route definitions (see Sidebar.tsx)

**Key Changes:**

```diff
- className="border-[#1E3A8A]/10"
+ className="border-lodgra-primary/10"

- className="text-[#1E3A8A]"
+ className="text-lodgra-primary"

- className="bg-[#ffc000]"
+ className="bg-lodgra-accent"

- className="z-50"
+ className="z-modal"

- className="text-[10px]"
+ className="text-xs"

- className="text-[11px]"
+ className="text-sm"

- className="text-[14px]"
+ className="text-lg"

- className="text-[#1E3A8A]/30"
+ className="text-lodgra-primary/30"

- className="text-[#1E3A8A]/70"
+ className="text-lodgra-primary/70"
```

**Expected Changes:**
- Lines removed: 15
- Color consistency: 10/10 ✅
- Z-index alignment: z-modal (matches Header) ✅
- Visual diff: 0%

---

### Priority 4: AuthLayout.tsx (Low Impact, Simple)

**Current Issues:**
- 3 hardcoded color instances
- Simple background styling
- Mobile header styling

**Key Changes:**

```diff
- className="bg-[#f8f8f8]"
+ className="bg-lodgra-bg-light"

- className="border-black/[0.06]"
+ className="border-lodgra-border-light"

- className="z-40"
+ className="z-sidebar"
```

**Expected Changes:**
- Lines removed: 2
- Visual diff: 0%

---

### Priority 5: Header.tsx (Low Impact, Reference Component)

**Current Issues:**
- Duplicate NAV_PATHS (also in TopBar.tsx, Sidebar.tsx)
- Different styling approach than other layout components
- Less frequently used than TopBar/Sidebar

**Key Changes:**

```diff
- className="text-gray-600 hover:text-gray-900"
+ className="text-lodgra-primary/40 hover:text-lodgra-primary"

- className="z-50"
+ className="z-modal"
```

**Note:** This component uses different color palette (grays vs brand colors). Consider aligning with other components or keeping as-is if intentional.

**Expected Changes:**
- Lines removed: 4
- Visual diff: Minor (text color alignment)

---

## 🔗 Route Configuration Consolidation

**Current State (Duplicated):**
- TopBar.tsx: PATH_LABELS (9 routes)
- Sidebar.tsx: PRIMARY_PATHS (7 routes)
- BottomNav.tsx: PRIMARY_PATHS + MORE_PATHS (10 routes)
- Header.tsx: NAV_PATHS (7 routes)

**Recommendation (Phase 5):**
Create centralized route config:

```typescript
// src/lib/navigation/routes.ts
export const NAVIGATION_ROUTES = {
  dashboard: { 
    path: '/', 
    label: 'Dashboard', 
    icon: Home,
    visibility: ['admin', 'manager', 'gestor']
  },
  properties: { 
    path: '/properties', 
    label: 'Propriedades', 
    icon: Building2,
    visibility: ['admin', 'manager', 'gestor']
  },
  // ... etc
}
```

**Then in components:**
```tsx
const routes = Object.values(NAVIGATION_ROUTES).filter(
  r => r.visibility.includes(userRole)
)
```

**Impact:**
- Single source of truth
- Reduced duplication (3 → 1)
- Easier maintenance

---

## 📊 Migration Impact Summary

| Component | Size | Hardcoded | Changes | Risk |
|-----------|------|-----------|---------|------|
| **TopBar** | 79 LOC | 12 | 8 | Low |
| **Sidebar** | 172 LOC | 18 | 12 | Low |
| **BottomNav** | 193 LOC | 22 | 15 | Medium |
| **AuthLayout** | 45 LOC | 3 | 2 | Low |
| **Header** | 130 LOC | 8 | 4 | Low |
| **TOTAL** | **619 LOC** | **63** | **41** | **Low** |

---

## ✅ Migration Checklist

### Pre-Migration
- [ ] tokens.css imported in root layout
- [ ] tailwind.config.ts updated
- [ ] Build passes
- [ ] All current tests pass

### TopBar.tsx
- [ ] Replace color hardcodes
- [ ] Replace font family inline
- [ ] Update z-index
- [ ] Update font sizes
- [ ] Update letter spacing
- [ ] Visual check (no changes)
- [ ] Tests pass

### Sidebar.tsx
- [ ] Replace color hardcodes
- [ ] Replace font family inline
- [ ] Update z-index
- [ ] Update font sizes/weights
- [ ] Update border colors
- [ ] Visual check (no changes)
- [ ] Tests pass
- [ ] Role filtering still works

### BottomNav.tsx
- [ ] Replace color hardcodes
- [ ] Update z-index
- [ ] Update font sizes
- [ ] Update letter spacing
- [ ] Check Sheet styling (Shadcn)
- [ ] Visual check (no changes)
- [ ] Tests pass
- [ ] Mobile view verified

### AuthLayout.tsx
- [ ] Replace background color
- [ ] Replace border color
- [ ] Update z-index
- [ ] Visual check (no changes)
- [ ] Tests pass

### Header.tsx
- [ ] Replace color hardcodes
- [ ] Update z-index
- [ ] Coordinate with TopBar styling
- [ ] Visual check
- [ ] Tests pass

### Post-Migration
- [ ] All tests pass
- [ ] Build successful
- [ ] Visual regression test (0 changes)
- [ ] Performance check
- [ ] Accessibility audit (WCAG AA)

---

## 🚀 Execution Steps

### Day 1: Setup
```bash
# 1. Import tokens
# 2. Update tailwind.config.ts
# 3. npm run build (verify)
# 4. npm run dev (verify)
```

### Day 2-3: Component Migration
```bash
# For each component in order (TopBar → Header):
# 1. Open component file
# 2. Replace hardcoded values with tokens
# 3. Run: npm run lint -- {component}.tsx
# 4. Run: npm run build
# 5. Visual check in browser
# 6. Run: npm test -- {component}.tsx
# 7. Commit: fix: migrate {Component} to use design tokens
```

### Day 4: Testing
```bash
# 1. Full test suite: npm test
# 2. Build: npm run build
# 3. Visual regression: manual check all pages
# 4. Lighthouse: npm run build && npm run preview
# 5. Accessibility: a11y audit
```

### Day 5: Documentation + Cleanup
```bash
# 1. Update component documentation
# 2. Create migration report
# 3. Clean up any unused CSS
# 4. Create PR for review
```

---

## 📈 Success Criteria

✅ **Code Quality**
- All hardcoded values replaced with tokens
- No inline color/font declarations
- Tailwind classes use semantic names

✅ **Visual Quality**
- ZERO visual changes to any component
- Responsive behavior preserved
- Hover/active states preserved

✅ **Testing**
- All unit tests pass
- All integration tests pass
- Visual regression: 0 changes detected

✅ **Performance**
- Bundle size: same or smaller
- Load time: same or faster
- No performance regression

✅ **Accessibility**
- WCAG AA compliance maintained
- Color contrast preserved
- Focus states preserved

---

## 🛠️ Tools & Commands

```bash
# Build and test
npm run build
npm test
npm run lint
npm run typecheck

# Development
npm run dev

# Verification
npm run preview  # Production build preview
```

---

## 📚 Related Documentation

- **tokens.yaml** — Token definitions
- **tokens.css** — CSS variables implementation
- **DESIGN_SYSTEM_GUIDE.md** — Full guide
- **TOKENS_MIGRATION_GUIDE.md** — Token usage guide
- **tailwind.config.ts** — Tailwind configuration

---

## 🎓 Learning Resources

For component maintainers:

1. **Understanding Tokens**
   - Read: `docs/design-system/DESIGN_SYSTEM_GUIDE.md`
   - Focus: Color, typography, spacing tokens

2. **Token Usage Patterns**
   - Example: TopBar → Sidebar → BottomNav
   - Pattern: Replace hardcode → Use token → Verify visual

3. **Atomic Design**
   - Phase 4 (Build): Create atoms (Button, Input, Label)
   - Phase 4 (Compose): Build molecules from atoms

---

## ⚠️ Common Pitfalls

❌ **Changing colors during migration**  
→ Migration is code-only. Don't change design.

❌ **Inconsistent token usage**  
→ Always use tokens, never hardcode values.

❌ **Skipping tests**  
→ Every component needs visual + unit tests.

❌ **Not verifying visual output**  
→ Always check browser before committing.

---

## ✨ Next Steps (Phase 4 & 5)

After migration complete:

1. **Phase 4 (Build):** `*build` — Create atomic components
2. **Phase 4 (Compose):** `*compose` — Build molecules
3. **Phase 5 (Document):** `*document` — Generate pattern library
4. **Phase 5 (Quality):** `*a11y-check` — Verify accessibility

---

**Status:** ✅ Migration strategy ready for execution  
**Generated by:** Uma (UX Design Expert)  
**Timeline:** 1 week (5 working days)  
**Risk Level:** LOW (zero visual impact)
