# Contributing to Lodgra

Thank you for interest in contributing to Lodgra! This guide helps you get started.

---

## Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or pnpm
- Git

### Local Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/fabiolpgomes/lodgra.git
   cd lodgra
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

---

## Development Workflow

### Creating a Feature

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes & test**
   ```bash
   # Edit code
   npm run dev     # Test locally
   npm run lint    # Check code style
   npm test        # Run tests
   npm run build   # Verify production build
   ```

3. **Commit with conventional messages**
   ```bash
   git commit -m "feat: add new feature description"
   ```

4. **Push & create PR**
   ```bash
   git push origin feature/my-feature
   # Open PR on GitHub
   ```

---

## Commit Message Format

Follow conventional commits:

```
type(scope): description

[optional body]
[optional footer]
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `style` — Code style (formatting, semicolons)
- `refactor` — Code refactoring
- `perf` — Performance improvement
- `test` — Adding tests
- `chore` — Maintenance tasks

**Examples:**
```
feat(properties): add property photo gallery
fix(auth): correct password reset email link
docs: update environment variables guide
```

---

## Code Standards

### TypeScript
- Always use strict TypeScript
- No `any` types without good reason
- Export types properly

```tsx
// ✅ Good
interface PropertyDetails {
  id: string
  name: string
  price: number
}

export function PropertyCard({ property }: { property: PropertyDetails }) {
  return <div>{property.name}</div>
}

// ❌ Bad
export function PropertyCard({ property }: { property: any }) {
  return <div>{property.name}</div>
}
```

### React Components
- Use functional components with hooks
- Keep components focused and single-responsibility
- Use `'use client'` only when necessary

```tsx
// ✅ Good
'use client'

import { useState } from 'react'

export function FilterPanel() {
  const [filters, setFilters] = useState({})
  // ...
}

// ❌ Bad - don't use 'use client' for every component
'use client'
export function Layout({ children }) {
  return <div>{children}</div>
}
```

### Naming Conventions
- Components: PascalCase (`PropertyCard.tsx`)
- Functions/variables: camelCase (`getPropertyDetails()`)
- Constants: UPPER_SNAKE_CASE (`MAX_GUESTS = 10`)
- Files: kebab-case for utility files (`format-currency.ts`)

### Testing
- Write tests for new features
- Run `npm test` before committing
- Aim for > 80% coverage on new code

---

## Performance Guidelines

### Images
- Always use Next.js `Image` component
- Optimize SVGs
- Use WebP format when possible

```tsx
// ✅ Good
import Image from 'next/image'

export function PropertyImage({ src, alt }) {
  return <Image src={src} alt={alt} width={400} height={300} />
}

// ❌ Bad
export function PropertyImage({ src, alt }) {
  return <img src={src} alt={alt} />
}
```

### Lazy Loading
- Use `dynamic()` for heavy components
- Lazy load modals and heavy UI

```tsx
// ✅ Good
const AdminPanel = dynamic(() => import('@/components/admin/AdminPanel'), {
  loading: () => <Skeleton />,
  ssr: false,
})

// Use in component
export function Dashboard() {
  return <AdminPanel />
}
```

### Database Queries
- Use caching for frequently accessed data
- Avoid N+1 queries
- Use indexes for filters

---

## Documentation

### Code Comments
Write comments for **WHY**, not **WHAT**:

```tsx
// ✅ Good - explains the reason
// Stripe requires idempotency keys to prevent duplicate charges
const idempotencyKey = `${userId}-${Date.now()}`

// ❌ Bad - just restates the code
// Create idempotency key
const idempotencyKey = `${userId}-${Date.now()}`
```

### Update Documentation
If your change affects:
- API behavior → Update `docs/api/README.md`
- Environment setup → Update `docs/guides/environment-variables.md`
- Performance → Update `docs/guides/performance-optimization.md`

---

## Testing Checklist

Before submitting PR:

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes (if available)
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] Feature works in browser
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Accessibility checked (tab navigation, ARIA labels)

---

## Review Process

### What to Expect
1. Automated checks run (lint, test, build)
2. Code review from team
3. Feedback & iteration (if needed)
4. Approval & merge

### Review Comments
- Don't take feedback personally
- Ask clarifying questions
- Discuss alternatives if you disagree

---

## Security

### Reporting Vulnerabilities

⚠️ **Do NOT open GitHub issues for security vulnerabilities**

Instead, report to: **security@lodgra.io**

Include:
- Vulnerability description
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## Getting Help

- **Questions?** Open a Discussion on GitHub
- **Bug?** Open an Issue with reproduction steps
- **Feature request?** Start a Discussion first

---

## Project Structure

```
lodgra/
├── src/
│   ├── app/          # Next.js app router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities & helpers
│   ├── types/        # TypeScript type definitions
│   └── hooks/        # Custom React hooks
├── docs/             # Documentation
├── public/           # Static files
├── tests/            # Test files
└── .env.example      # Environment template
```

---

## Useful Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Check code style
npm test             # Run tests
npm run typecheck    # TypeScript check (if available)

# Formatting
npm run format       # Auto-format code (if available)

# Database
npm run db:migrate   # Apply migrations

# Deployment
git push origin main # Trigger Vercel deploy
```

---

## Common Issues

### Port 3000 already in use
```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Supabase connection failed
- Check `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- Verify API keys are correct
- Check internet connection

### Tests failing
```bash
# Clear cache and retry
npm run test -- --clearCache
```

---

## Thank You! 🙏

Your contributions help make Lodgra better for everyone.

---

**Need clarification?** Create a Discussion or email team@lodgra.io

---

**Last Updated:** 2026-05-20
