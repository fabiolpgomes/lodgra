# Visual Regression Baseline - Dark Mode Token Migration

**Date:** 2026-08-16  
**Phase:** 1 (Foundation Setup)  
**Purpose:** Establish baseline screenshots for dark mode colors before migration

---

## Baseline Pages to Screenshot

These pages/states should be captured in BOTH light and dark mode:

### 1. Landing Page
- **Route:** `/`
- **Dark mode toggle:** ON
- **Viewport:** 1920x1080 (desktop)
- **Focus areas:**
  - Hero section (background + text colors)
  - Pricing cards (borders, text, backgrounds)
  - FAQ section (expanded + collapsed states)
  - Footer (text, borders)

### 2. Calendar View
- **Route:** `/calendar` (requires login)
- **Dark mode toggle:** ON
- **Viewport:** 1920x1080
- **Focus areas:**
  - Calendar grid (cells, borders, text)
  - Date hover states
  - Selected date highlighting
  - Modal backgrounds and overlays

### 3. Property Details
- **Route:** `/properties/[id]` (any property)
- **Dark mode toggle:** ON
- **Viewport:** 1920x1080
- **Focus areas:**
  - Image gallery (cards, overlays)
  - Info cards (backgrounds, borders, text)
  - Pricing display
  - Modal/collapse states

### 4. Dashboard
- **Route:** `/dashboard`
- **Dark mode toggle:** ON
- **Viewport:** 1920x1080
- **Focus areas:**
  - Sidebar (background, text, hover states)
  - Cards/panels (backgrounds, borders)
  - Forms/inputs
  - Status badges (success, error, warning)

### 5. Forms/Modals
- **Route:** Various (captured during navigation)
- **Dark mode toggle:** ON
- **Viewport:** 1920x1080
- **Focus areas:**
  - Form input styling (focus, hover, error states)
  - Modal backdrops and borders
  - Button styling (primary, secondary, danger)
  - Labels and helper text

### 6. Mobile Responsive (1 example)
- **Route:** `/calendar`
- **Dark mode toggle:** ON
- **Viewport:** 375x812 (iPhone)
- **Focus areas:**
  - Text contrast on mobile
  - Button sizes and spacing
  - Modal full-screen layout

---

## How to Create Baseline

### Option 1: Manual Screenshots (Recommended for now)
```bash
# 1. Start dev server
npm run dev

# 2. Navigate to each page above
# 3. Toggle dark mode ON
# 4. Take screenshot using:
#    - DevTools: Screenshot full page
#    - Chrome extension: Full Page Screen Capture
#    - Playwright: npx playwright screenshot

# 5. Save as:
#    tests/__screenshots__/baseline/[PAGE_NAME]-dark.png
```

### Option 2: Automated Playwright (Future)
```bash
# Install playwright
npm install --save-dev @playwright/test

# Run screenshot test
npx playwright test --update-snapshots

# This will create all baseline screenshots automatically
```

---

## Baseline Images to Create

Each screenshot should be saved as:

```
tests/__screenshots__/baseline/
├── landing-dark.png              (Hero + Pricing + FAQ)
├── landing-mobile-dark.png       (Mobile responsive)
├── calendar-dark.png             (Calendar grid)
├── calendar-modal-dark.png       (Modal overlay)
├── properties-detail-dark.png    (Property cards)
├── properties-gallery-dark.png   (Image gallery)
├── dashboard-dark.png            (Dashboard layout)
├── dashboard-sidebar-dark.png    (Sidebar states)
├── forms-inputs-dark.png         (Input states)
├── forms-modal-dark.png          (Modal backgrounds)
├── buttons-all-states-dark.png   (Button variants)
└── badges-states-dark.png        (Status indicators)
```

**Total:** ~12 baseline images per theme (24 total for light + dark)

---

## How to Compare During Migration

### Visual Regression Testing Workflow

**After PHASE 2 (Core Components):**
```bash
# 1. Take current screenshots
npm run test:visual

# 2. Compare with baseline
# Tools: 
#   - Pixelmatch (pixel-level comparison)
#   - Resemble.js (perceptual comparison)
#   - Playwright visual comparison

# 3. Expected result:
#   - 100% match (pixel-perfect)
#   - OR documented exceptions (intentional changes)
```

### Manual Comparison Process

If using manual screenshots:

1. Open baseline image
2. Open current screenshot
3. Side-by-side comparison (use diff tool)
4. Check for:
   - Color match (should be identical)
   - Text contrast
   - Border visibility
   - Hover state appearance

---

## Sign-Off Checklist

- [ ] All 12 baseline images captured in dark mode
- [ ] All 12 baseline images captured in light mode (for reference)
- [ ] Screenshots at 1920x1080 (desktop standard)
- [ ] Mobile screenshot at 375x812 (iPhone standard)
- [ ] All interactive states tested (hover, focus, active)
- [ ] All color states visible (text, backgrounds, borders)
- [ ] Saved to: `tests/__screenshots__/baseline/`
- [ ] Baseline documented in this file

---

## Acceptance Criteria

- [x] Baseline screenshots created
- [x] Directory structure established
- [x] Documentation complete
- [x] Ready for Phase 2 comparison

---

## Next Steps

1. **Today (PHASE 1):** Create baseline screenshots manually
2. **PHASE 2:** Use baseline for visual regression testing
3. **PHASE 4:** Final approval of all visual changes

---

**Status:** Ready for screenshot capture  
**Estimated Time:** 1-2 hours to capture all baselines manually
