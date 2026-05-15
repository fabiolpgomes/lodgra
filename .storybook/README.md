# Storybook Configuration

Design system component library documentation and preview.

## Getting Started

### Start Storybook Development Server
```bash
npm run storybook
# Opens http://localhost:6006
```

### Build Static Storybook
```bash
npm run build-storybook
# Outputs to storybook-static/
```

---

## Component Stories

### Story Files Location
- Story files: `src/.stories-disabled/*.stories.tsx` (temporarily disabled due to build conflicts)
- Can be re-enabled when Storybook configuration is stable

### Accessing Components in Storybook
1. Navigate to http://localhost:6006
2. Browse "Atoms", "Molecules", "Organisms" sections
3. View component variations and interactive controls
4. Read auto-generated documentation (Docs tab)

---

## Story Format (CSF 3.0)

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/design-system/atoms/Button'

const meta = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
}
```

---

## Design Tokens in Storybook

All design tokens are automatically available:
- CSS Variables: `var(--lodgra-primary)`
- Tailwind Classes: `bg-lodgra-primary text-design-sm`

Configure in `.storybook/preview.ts`:
```ts
import '../src/styles/tokens.css'
```

---

## Documentation

- **Component Library:** `docs/design-system/PATTERN_LIBRARY.md`
- **API Reference:** `docs/design-system/API_REFERENCE.md`
- **Accessibility:** `docs/design-system/A11Y_AUDIT.md`
- **ROI Report:** `docs/design-system/ROI_REPORT.md`

---

## CI/CD Integration

Storybook is built and deployed via:
- GitHub Actions: `.github/workflows/storybook-deploy.yml`
- Static site: Published to GitHub Pages

---

## Troubleshooting

### Port 6006 Already in Use
```bash
npm run storybook -- --port 6007
```

### Build Errors
- Check `.storybook/main.ts` paths
- Verify imports in story files
- Ensure dependencies are installed: `npm install`

### Hot Reload Not Working
- Clear cache: `rm -rf node_modules/.cache`
- Restart dev server

---

**Storybook Version:** 10.4.0  
**Framework:** Next.js 16  
**Last Updated:** 2026-05-15
