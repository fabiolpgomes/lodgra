# Design Token Versioning Guide

## Overview

The Lodgra design system uses **semantic versioning** for design tokens, enabling controlled evolution of the token library while maintaining clear communication about compatibility and breaking changes.

**Current Version:** 1.0.0  
**Last Updated:** 2026-05-15

---

## Semantic Versioning (SemVer)

All token releases follow the `MAJOR.MINOR.PATCH` format:

### MAJOR Version (X.0.0)
**When to bump:** Breaking changes that require code updates

Examples:
- Renaming a token (e.g., `color.primary` → `color.brand`)
- Removing an actively-used token
- Restructuring the token hierarchy
- Changing token value structure

**Consumer Impact:** ⚠️ **HIGH** — Requires migration
**Release Example:** 1.0.0 → 2.0.0

---

### MINOR Version (X.Y.0)
**When to bump:** New tokens added (backward compatible)

Examples:
- Adding new color tokens
- Introducing new typography sizes
- Expanding spacing scale
- Adding new component tokens (shadows, transitions)

**Consumer Impact:** ✅ **LOW** — Safe to adopt immediately
**Release Example:** 1.0.0 → 1.1.0

---

### PATCH Version (X.Y.Z)
**When to bump:** Bug fixes and adjustments

Examples:
- Fixing a color value for accessibility
- Correcting a spacing calculation
- Adjusting line-height values
- Fixing CSS variable syntax

**Consumer Impact:** ✅ **SAFE** — Always adopt immediately
**Release Example:** 1.0.0 → 1.0.1

---

## Token Change Detection

The versioning system automatically analyzes changes to `tokens.yaml`:

| Change Type | Example | Suggested Version |
|-------------|---------|-------------------|
| Token addition | New `color.tertiary` | MINOR |
| Token removal | Delete `spacing.xl` | MAJOR |
| Token rename | `primary` → `brand.primary` | MAJOR |
| Value change | `#1E3A8A` → `#1E3F8F` | PATCH |
| Multiple changes | Add 5, modify 2 | MINOR (if additive) |

---

## Version Management Commands

### Check for Changes (No Action)
```bash
npm run version:tokens -- --check
```
Output: Shows detected changes without bumping version

### Auto-Patch (Bug Fixes)
```bash
npm run version:tokens -- --patch
```
- Increments: 1.0.0 → 1.0.1
- Use for: Color adjustments, spacing fixes

### Auto-Minor (New Tokens)
```bash
npm run version:tokens -- --minor
```
- Increments: 1.0.0 → 1.1.0
- Use for: Adding colors, typography sizes

### Auto-Major (Breaking Changes)
```bash
npm run version:tokens -- --major
```
- Increments: 1.0.0 → 2.0.0
- Use for: Renaming, removing, restructuring tokens

### Interactive (Recommended)
```bash
npm run version:tokens
```
Output: Suggests version bump based on changes, requires confirmation

---

## Release Workflow

### Step 1: Make Changes
Edit `tokens.yaml` with your new or modified tokens:
```yaml
colors:
  brand:
    primary:
      value: '#1E3A8A'  # Updated value
    
    tertiary:           # New token
      value: '#2D5A96'
      description: 'Tertiary brand color'
```

### Step 2: Detect Changes
```bash
npm run version:tokens -- --check
```
Output:
```
📦 Current version: 1.0.0
📊 Changes detected:
   + Additions: 1
   - Removals: 0
   ~ Modifications: 1
💡 Suggested bump: minor
```

### Step 3: Bump Version
```bash
npm run version:tokens -- --minor
```
Output:
```
✨ Version bump: 1.0.0 → 1.1.0 (minor)
✅ Updated .aios/tokens/version.json
✅ Updated .aios/tokens/CHANGELOG.md
✅ Git commit created
✅ Tagged as: tokens-1.1.0
```

### Step 4: Verify
```bash
git log --oneline | head -5
git tag | grep tokens-
```

---

## Changelog Structure

The changelog is maintained in `.aios/tokens/CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [1.1.0] - 2026-05-20

### Added
- New tertiary brand color token
- Extended spacing scale (3xl, 4xl)

### Changed
- Primary color lightened from #1E3A8A to #2D5B96 for better contrast

### Removed
- Deprecated `color.disabled` token (use `status.disabled` instead)
```

---

## Distribution and Integration

### For Designers (Figma/Penpot)
Token changes are versioned and documented in the changelog. Use the git tag to reference specific versions:
```bash
git show tokens-1.1.0:tokens.yaml
```

### For Developers (NPM Consumers)
Future: Tokens will be published as `@lodgra/design-tokens@1.1.0`
```bash
npm install @lodgra/design-tokens@1.1.0
```

### For CSS Users
Import from tag:
```bash
# Latest release
curl https://raw.githubusercontent.com/lodgra/design-system/tokens-1.1.0/tokens.yaml

# CSS variables generated per tag
curl https://raw.githubusercontent.com/lodgra/design-system/tokens-1.1.0/src/styles/tokens.css
```

---

## Migration Guides

### Upgrading from 1.0.0 → 1.1.0 (MINOR)
✅ **No code changes needed** — All changes are additive and backward compatible

### Upgrading from 1.0.0 → 2.0.0 (MAJOR)
⚠️ **Code migration required** — Review CHANGELOG.md for breaking changes

Example migration guide (if tokens are renamed):
```javascript
// Before (v1.0.0)
className={cn('text-color-primary')}

// After (v2.0.0)
className={cn('text-brand-primary')}
```

---

## Best Practices

### ✅ DO
- **Batch related changes** — Group additions and modifications logically
- **Test before versioning** — Verify CSS compilation, CSS variables, Tailwind integration
- **Update documentation** — Add context in changelog for significant changes
- **Use git tags** — Makes versions easily accessible and trackable
- **Communicate changes** — Notify consumers about MAJOR versions ahead of time

### ❌ DON'T
- **Version every single change** — Batch changes when reasonable
- **Skip changelog updates** — Always document what changed
- **Force-push tags** — Retagging breaks version immutability
- **Change token values secretly** — Always go through versioning workflow
- **Mix MAJOR/MINOR changes** — Keep a single concern per release

---

## Token File Locations

| File | Purpose | Versioned |
|------|---------|-----------|
| `tokens.yaml` | Master token definitions (DTCG format) | ✅ Yes |
| `.aios/tokens/version.json` | Current version metadata | ✅ Yes |
| `.aios/tokens/CHANGELOG.md` | Complete version history | ✅ Yes |
| `src/styles/tokens/*.css` | Generated CSS variables | ✅ Yes |
| `tailwind.config.ts` | Tailwind token integration | ✅ Yes |

---

## Continuous Integration

### Pre-Commit Hook
The system validates token syntax before commits:
```bash
git commit -m "..." 
# ✅ Validates tokens.yaml YAML syntax
# ✅ Checks for token naming conventions
# ✅ Verifies CSS generation
```

### GitHub Actions (Future)
```yaml
on: push
jobs:
  validate-tokens:
    - Validate YAML syntax
    - Generate CSS variables
    - Check CSS compilation
    - Verify Tailwind integration
    - Test token accessibility
```

---

## Troubleshooting

### "No changes detected"
- Ensure changes are staged: `git add tokens.yaml`
- Verify file was actually modified: `git diff tokens.yaml`

### "Suggested bump seems wrong"
- Manual override: `npm run version:tokens -- --major`
- The script suggests based on additions/removals, but you have final say

### "Git tag already exists"
- Delete and recreate: `git tag -d tokens-1.1.0 && git tag -a tokens-1.1.0 -m "..."`

### "Version doesn't match tokens.yaml"
- Resync: `npm run version:tokens -- --check` to see current state

---

## Future Enhancements

- [ ] DTCG JSON format alongside YAML
- [ ] Automated contrast validation for color changes
- [ ] Token transformation pipeline (SCSS, Tailwind, CSS-in-JS)
- [ ] Visual documentation with color/typography previews
- [ ] NPM package publishing with automated releases
- [ ] Slack/Discord notifications for new releases
- [ ] Token usage analytics (which tokens are used where)
- [ ] Automated migration guides for MAJOR versions

---

## Reference

- **W3C Design Tokens Community Group:** https://design-tokens.github.io/community-group/format/
- **Semantic Versioning:** https://semver.org/
- **Keep a Changelog:** https://keepachangelog.com/
- **Token Files:** `.aios/tokens/`
