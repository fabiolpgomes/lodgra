# Design Tokens Changelog

All notable changes to the Lodgra design tokens will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-05-15

### Added

**Color Tokens (12 semantic colors):**
- `brand.primary` (#1E3A8A) - Primary brand blue
- `brand.accent` (#ffc000) - Accent yellow for hover/active states
- `brand.secondary` - Secondary brand colors
- `semantic.border.*` - Border color palette
- `semantic.text.*` - Text color palette
- `semantic.background.*` - Background color palette
- `status.success` - Success state (green)
- `status.error` - Error state (red)
- `status.warning` - Warning state (orange)
- `status.info` - Info state (blue)

**Typography Tokens (7 tokens):**
- `font.family.primary` - "Segoe UI, Roboto, sans-serif"
- `font.family.mono` - "Monaco, Courier New, monospace"
- `font.size.*` - 5 standard sizes (xs, sm, base, lg, xl)
- `font.weight.*` - 3 weight levels (normal, medium, bold)
- `letter.spacing.*` - 3 spacing levels (tight, normal, wide)
- `line.height.*` - 3 line height levels

**Spacing Tokens (15 tokens):**
- `spacing.xs` through `spacing.2xl` - Consistent 8px-based scale
- `size.*` - Width/height sizing scale

**Component Tokens (20+ tokens):**
- `z-index.*` - Layering scale (dropdown, modal, tooltip, etc.)
- `border.*` - Border widths and styles
- `shadow.*` - Box shadow presets (sm, md, lg, xl)
- `radius.*` - Border radius variants
- `transition.*` - Animation timing and durations

### Details

- **Total Tokens:** 67
- **Format:** W3C Design Tokens Community Group (DTCG)
- **Generated from:** Consolidated component audit (47 button variants → 3, 87 colors → 12)
- **Coverage:** Atoms, Molecules, Organisms components
- **CSS Variables:** All tokens exported as CSS custom properties
- **Tailwind Integration:** Colors and font sizes integrated into tailwind.config.ts
- **TypeScript Support:** Full type safety with token interfaces

### Files Created

- `tokens.yaml` - Master token definitions
- `src/styles/tokens/colors.css` - Color token CSS variables
- `src/styles/tokens/typography.css` - Typography CSS variables
- `src/styles/tokens/spacing.css` - Spacing CSS variables
- `src/styles/tokens/components.css` - Component CSS variables
- `src/styles/tokens.css` - Global token import entry point

### Breaking Changes

None - initial release.

---

## Versioning Strategy

### MAJOR Version (X.0.0)
- Breaking changes to token names (e.g., renaming `color.primary` → `color.brand`)
- Removing tokens that are actively used
- Changing token value structure
- API contract changes

**Example:** 1.0.0 → 2.0.0 if we restructure token hierarchy

### MINOR Version (X.Y.0)
- New tokens added (backward compatible)
- New semantic colors or typography sizes
- Extending token families without breaking existing ones
- Adding new component tokens (shadows, transitions, etc.)

**Example:** 1.0.0 → 1.1.0 if we add 5 new color tokens

### PATCH Version (X.Y.Z)
- Bug fixes in token values
- Adjusting color values for accessibility (WCAG compliance)
- Correcting spacing calculations
- Fixing CSS variable exports

**Example:** 1.0.0 → 1.0.1 if we fix a color contrast issue

---

## Release Process

1. **Edit** `tokens.yaml` with changes
2. **Run** `npm run version:tokens` to detect changes and suggest version bump
3. **Review** the changelog entry
4. **Confirm** version bump (semantic versioning rules applied)
5. **Commit** with message: `chore(tokens): bump to v{new-version}`
6. **Tag** git commit: `git tag -a tokens-{new-version}`
7. **Push** tag: `git push origin tokens-{new-version}`

---

## Token Categories

### Semantic Tokens
- Used directly in component implementations
- Tied to design decisions
- Examples: `brand.primary`, `status.error`

### System Tokens
- Foundation tokens used to build semantic tokens
- Lower level of abstraction
- Examples: Individual color hex values, font sizes in px

### Component-Specific Tokens
- Tokens scoped to specific component needs
- Examples: `z-index.modal`, `shadow.dropdown`

---

## Compatibility Policy

### For Consumers (Applications using tokens)

- **MAJOR:** Requires code updates; plan migration
- **MINOR:** Additive only; safe to adopt immediately
- **PATCH:** Always safe; adopt immediately

### Token Distribution

- **NPM Package:** `@lodgra/design-tokens` (future release)
- **CSS Variables:** Committed to repo, versioned with git tags
- **Tailwind Config:** Updated with each release

---

## Change Detection

Changes are automatically detected by analyzing:
1. Token additions (new keys in `tokens.yaml`)
2. Token removals (deleted keys from `tokens.yaml`)
3. Token renames (semantic analysis)
4. Token value changes (updated values)

**Severity indicators:**
- **CRITICAL:** Removals, renames → suggest MAJOR
- **MEDIUM:** Value changes → suggest PATCH
- **LOW:** Additions → suggest MINOR

---

## Future Enhancements

- [ ] DTCG JSON format support alongside YAML
- [ ] Token transformation pipeline (SCSS, CSS-in-JS)
- [ ] Automated contrast checker for color tokens
- [ ] Design token package publishing to NPM
- [ ] Visual token documentation with live previews
- [ ] Token usage analytics (which tokens are used where)
- [ ] Automated migration guides for MAJOR versions
