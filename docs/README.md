# Lodgra Documentation

Complete guides for development, deployment, and operations.

---

## 🚀 Getting Started

**New to Lodgra?** Start here:

1. **[CONTRIBUTING.md](../CONTRIBUTING.md)** — How to contribute
2. **[Environment Variables](guides/environment-variables.md)** — Setup your `.env.local`
3. **[API Endpoints](api/README.md)** — Available APIs quick reference

---

## 📖 Guides

### Development

- **[Environment Variables](guides/environment-variables.md)**
  - Complete reference for all env vars
  - Setup instructions (local & production)
  - Security best practices

- **[SEO & Analytics](guides/seo-analytics.md)**
  - Google indexing & Search Console setup
  - Meta descriptions & OpenGraph
  - Analytics implementation
  - Performance monitoring

- **[Performance Optimization](guides/performance-optimization.md)**
  - Current optimization status
  - Recommended improvements
  - 6-month optimization roadmap
  - Performance metrics & monitoring

### Architecture

- **[System Architecture](architecture/README.md)** *(to be created)*
  - High-level system design
  - Database schema overview
  - API structure

- **[Database Guide](architecture/database.md)** *(to be created)*
  - Schema documentation
  - RLS policies
  - Optimization guidelines

### Operations

- **[Deployment Guide](ops/deployment.md)** *(to be created)*
  - Vercel deployment
  - Environment promotion (staging → production)
  - Rollback procedures

- **[Monitoring & Logging](ops/monitoring.md)** *(to be created)*
  - Sentry error tracking
  - Performance monitoring
  - Analytics dashboards

---

## 🔗 API Documentation

- **[API Endpoints](api/README.md)** — Quick reference for all endpoints
- **[Authentication](api/auth.md)** *(to be created)* — Auth flow & JWT
- **[Webhooks](api/webhooks.md)** *(to be created)* — Stripe & third-party webhooks

---

## 🛡️ Security

- **[security.txt](../.well-known/security.txt)** — Vulnerability reporting
- **[Security Checklist](security/checklist.md)** *(to be created)*
  - OWASP guidelines
  - Security best practices
  - Code review checklist

---

## 📊 Monitoring & Observability

### Current Setup

| Tool | Purpose | Status |
|------|---------|--------|
| **Google Analytics** | User behavior tracking | ✅ Configured |
| **Google Search Console** | SEO monitoring | ✅ Configured |
| **Sentry** | Error tracking | ✅ Active |
| **Vercel Analytics** | Deployment metrics | ✅ Enabled |

### Monitoring Dashboards

- [Google Analytics](https://analytics.google.com/analytics/web/provision/#/provision) — User metrics
- [Google Search Console](https://search.google.com/search-console) — SEO performance
- [Sentry Dashboard](https://sentry.io/) — Error tracking
- [Vercel Project](https://vercel.com/dashboard) — Deployment status

---

## 🔍 Troubleshooting

### Common Issues

**Q: Build fails locally**
```bash
# Try cleaning cache
rm -rf .next
npm run build
```

**Q: Database connection error**
- Check `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- Verify Supabase project is active
- Check internet connection

**Q: Email not sending**
- Verify `RESEND_API_KEY` in environment variables
- Check Resend dashboard for errors
- Look at Sentry logs for stack trace

See [Guides](#-guides) for detailed troubleshooting.

---

## 📋 Checklists

### Development

- [x] Environment configured
- [ ] Feature implemented
- [ ] Tests written
- [ ] Code reviewed
- [ ] Committed with conventional message
- [ ] PR created & merged

### Deployment

- [ ] All tests pass
- [ ] Build succeeds
- [ ] No console errors
- [ ] Performance baseline met
- [ ] Monitoring configured
- [ ] Rollback plan ready

---

## 🗺️ Documentation Map

```
docs/
├── README.md                    # This file
├── api/
│   ├── README.md                # API quick reference
│   ├── auth.md                  # Auth flow (to create)
│   └── webhooks.md              # Webhooks (to create)
├── guides/
│   ├── environment-variables.md # Env setup
│   ├── seo-analytics.md         # SEO & Analytics
│   ├── performance-optimization.md # Performance
│   └── security.md              # Security (to create)
├── architecture/                # System design (to create)
├── ops/                         # Operations (to create)
└── security/                    # Security docs (to create)
```

---

## 📝 Contributing Documentation

Found an issue? Want to improve docs?

1. Edit relevant `.md` file
2. Check formatting with preview
3. Submit PR with clear description

Documentation standards:
- Clear section headings (`#`, `##`, `###`)
- Code examples for complex topics
- Links to related docs
- "Last Updated" timestamp at bottom

---

## 📚 External Resources

- **[Next.js Documentation](https://nextjs.org/docs)** — Framework guides
- **[Supabase Documentation](https://supabase.com/docs)** — Database & Auth
- **[Stripe Documentation](https://stripe.com/docs)** — Payment processing
- **[Vercel Documentation](https://vercel.com/docs)** — Deployment

---

## 🎯 Quick Links

**For Different Roles:**

| Role | Start Here |
|------|-----------|
| **Developer** | [Contributing](../CONTRIBUTING.md) → [Environment Variables](guides/environment-variables.md) |
| **DevOps** | [Deployment Guide](ops/deployment.md) → [Monitoring](ops/monitoring.md) |
| **Product Manager** | [API Endpoints](api/README.md) → [Architecture](architecture/README.md) |
| **Security Researcher** | [Security Checklist](security/checklist.md) → [security.txt](../.well-known/security.txt) |

---

## 📞 Support

- **Questions?** Create a GitHub Discussion
- **Bug?** Open an Issue
- **Security issue?** Email security@lodgra.io

---

**Last Updated:** 2026-05-20  
**Total Guides:** 7 documented, 6 planned  
**Next Review:** 2026-06-20
