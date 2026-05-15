# @lodgra/design-tokens

Design tokens for Lodgra hospitality platform. Semantic, accessible, and production-ready design tokens following the [W3C Design Tokens Community Group (DTCG) format](https://design-tokens.github.io/community-group/format/).

## Features

- 🎨 **67 Production Tokens** — Color, typography, spacing, and component tokens
- 📦 **Multiple Formats** — CSS, JSON, YAML, Tailwind compatible
- ♿ **WCAG AA+ Compliant** — All colors tested for accessibility (7:1 contrast)
- 🔄 **Semantic Versioning** — MAJOR.MINOR.PATCH with automated changelog
- 🎯 **Framework Agnostic** — Works with any CSS-in-JS or CSS framework
- 📚 **Fully Documented** — TypeScript types, usage examples, best practices

## Installation

```bash
npm install @lodgra/design-tokens
```

## Usage

### CSS Variables

Import CSS variables directly:

```typescript
import '@lodgra/design-tokens/css'

// Use in CSS or styled components
const styles = css`
  color: var(--lodgra-primary);
  font-size: var(--lodgra-font-size-base);
  padding: var(--lodgra-spacing-md);
`
```

### JavaScript/TypeScript

```typescript
import tokens from '@lodgra/design-tokens'

// Access tokens programmatically
const primaryColor = tokens.colors.brand.primary.value
const spacing = tokens.spacing.md.value

// Use in styled components
const Button = styled.button`
  color: ${tokens.colors.brand.primary.value};
  padding: ${tokens.spacing.md.value};
`
```

### Tailwind CSS

The tokens are pre-configured for Tailwind:

```javascript
// tailwind.config.js
const tokens = require('@lodgra/design-tokens')

module.exports = {
  theme: {
    extend: {
      colors: tokens.colors,
      fontSize: tokens.typography.sizes,
    },
  },
}
```

### Design Tools (Figma, Penpot)

Export tokens for design tools:

```bash
npx @lodgra/design-tokens export --format=figma
```

## Token Structure

### Colors (12 semantic colors)
```
colors.brand.primary         // #1E3A8A
colors.brand.accent          // #ffc000
colors.semantic.border       // borders
colors.semantic.text         // text colors
colors.status.success        // success states
colors.status.error          // error states
```

### Typography (7 tokens)
```
typography.family.primary    // "Segoe UI, Roboto, sans-serif"
typography.size.xs|sm|base|lg|xl
typography.weight.normal|medium|bold
typography.lineHeight.tight|normal|loose
```

### Spacing (15 tokens)
```
spacing.xs|sm|md|lg|xl|2xl
sizing.xs|sm|md|lg|xl|2xl
```

### Components (20+ tokens)
```
z-index.modal               // 50
z-index.tooltip             // 40
shadows.sm|md|lg            // box-shadow presets
transitions.fast|normal     // animation timing
borders.radius              // border-radius values
```

## Versioning

Semantic versioning follows these rules:

- **MAJOR** — Breaking changes (renamed, removed tokens)
- **MINOR** — New tokens added (backward compatible)
- **PATCH** — Bug fixes and value adjustments

Current version: **1.0.0**

[View Changelog →](./CHANGELOG.md)

## Accessibility

All color tokens are validated for:
- ✅ WCAG AA compliance (4.5:1 for text)
- ✅ WCAG AAA compliance (7:1 for text) where possible
- ✅ Colorblind-safe palettes
- ✅ High contrast mode support

[View A11y Report →](../../docs/design-system/A11Y_AUDIT.md)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS 14+, Android 10+)

CSS Variables (custom properties) are used throughout.

## Development

### Update Tokens

Tokens are maintained in the monorepo at `/tokens.yaml`:

```bash
# Update tokens
# Apply semantic versioning
npm run version:tokens

# Rebuild package
npm run build
```

### Build Package

```bash
npm run build

# Output:
# - dist/tokens.css
# - dist/tokens.json
# - dist/index.js
# - dist/index.d.ts
```

### Publish to NPM

```bash
npm publish

# Publishes to:
# https://www.npmjs.com/package/@lodgra/design-tokens
```

## Related Resources

- **Pattern Library:** [Component patterns and best practices](../../docs/design-system/PATTERN_LIBRARY.md)
- **API Reference:** [All components documented](../../docs/design-system/API_REFERENCE.md)
- **Accessibility Audit:** [WCAG compliance report](../../docs/design-system/A11Y_AUDIT.md)
- **ROI Report:** [Business impact metrics](../../docs/design-system/ROI_REPORT.md)
- **Token Versioning:** [Semver strategy and workflow](../../docs/design-system/TOKEN_VERSIONING.md)

## License

MIT © 2026 Lodgra. See [LICENSE](../../LICENSE) for details.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

---

**Maintainers:** Lodgra Design System Team  
**Repository:** https://github.com/fabiolpgomes/lodgra  
**Issues:** https://github.com/fabiolpgomes/lodgra/issues
