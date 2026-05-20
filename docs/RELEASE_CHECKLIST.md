# Release Checklist

Complete checklist for safe and reliable releases to production.

---

## Pre-Release (24h before)

### Code Quality
- [ ] All tests passing: `npm test`
- [ ] Lint passing: `npm run lint`
- [ ] Build succeeding: `npm run build`
- [ ] No critical warnings in console
- [ ] TypeScript strict mode passing
- [ ] All TODO/FIXME comments reviewed

### Review & Testing
- [ ] Feature branch reviewed and approved
- [ ] Code review comments resolved
- [ ] Manual testing completed on preview deployment
- [ ] Mobile/responsive testing done
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Accessibility audit passed (keyboard nav, ARIA)

### Database
- [ ] Migrations tested locally
- [ ] Rollback procedure documented
- [ ] Database backups scheduled
- [ ] Schema changes reviewed by data engineer

### Dependencies
- [ ] No high-security vulnerabilities: `npm audit`
- [ ] Dependencies updated if needed
- [ ] Breaking changes documented

### Documentation
- [ ] Code comments updated
- [ ] API documentation updated (if endpoints changed)
- [ ] README.md updated (if applicable)
- [ ] Environment variables documented
- [ ] Deployment notes written

---

## Release Day

### Morning

- [ ] Check all metrics are healthy
  - [ ] Error rate in Sentry
  - [ ] Performance metrics in Vercel
  - [ ] Database performance
- [ ] Verify staging environment is stable
- [ ] Review error logs for any anomalies
- [ ] Check external dependencies status
  - [ ] Stripe status page
  - [ ] Supabase status
  - [ ] Google services

### Deployment

- [ ] Create release branch locally
  ```bash
  git checkout -b release/v1.x.x
  ```

- [ ] Final pre-push checks
  ```bash
  npm run lint
  npm run build
  npm test
  ```

- [ ] Push to GitHub
  ```bash
  git push origin release/v1.x.x
  git push origin main
  ```

- [ ] Trigger deployment
  - [ ] Vercel auto-deploys on push
  - [ ] Wait for build to complete
  - [ ] Verify production URL loads

### Verification (Post-Deploy)

- [ ] Production site loads without errors
- [ ] Homepage loads correctly
- [ ] Login/authentication works
- [ ] Key features working:
  - [ ] Create property
  - [ ] View property details
  - [ ] Process payment (test payment)
  - [ ] Send email (if changed)
- [ ] Mobile site responsive
- [ ] No 404 or 500 errors

### Monitoring

- [ ] Watch Sentry for errors (5 min)
- [ ] Check Vercel analytics for anomalies
- [ ] Monitor response times
- [ ] Check database performance
- [ ] Review user feedback channels
  - [ ] Support email
  - [ ] Slack notifications
  - [ ] Status page

---

## Post-Release (4 hours)

### Monitoring

- [ ] Error rate normal: < 1% of requests
- [ ] Performance metrics healthy:
  - [ ] Page load time < 2s
  - [ ] API response time < 200ms
- [ ] No unusual database load
- [ ] Analytics tracking properly

### Stakeholder Communication

- [ ] Notify team in Slack
- [ ] Update status page (if applicable)
- [ ] Document deployment in changelog
- [ ] Notify product team of any issues

### Follow-up

- [ ] Gather early feedback from users
- [ ] Monitor for first 24 hours
- [ ] Keep team available for quick rollback
- [ ] Schedule post-mortem if issues found

---

## Rollback Procedure (If Needed)

⚠️ **Only if critical issues discovered**

### Decision Criteria

Rollback if:
- [ ] Error rate > 5% of requests
- [ ] API response time > 5s
- [ ] Database corruption/data loss
- [ ] Security vulnerability discovered
- [ ] User-facing feature completely broken

### Steps

1. **Alert Team**
   ```
   Slack: @devops "CRITICAL: Rolling back release v1.x.x"
   ```

2. **Trigger Rollback**
   - [ ] Vercel Dashboard → Deployments
   - [ ] Find previous stable deployment
   - [ ] Click "Promote to Production"
   - [ ] Verify rollback completed

3. **Investigation**
   - [ ] Check what failed
   - [ ] Review logs in Sentry
   - [ ] Document issue
   - [ ] Create issue for post-mortem

4. **Communication**
   - [ ] Notify users of incident
   - [ ] Schedule post-mortem for team
   - [ ] Document lessons learned

---

## Post-Release Review (24h after)

### Metrics Review

- [ ] Error rate healthy
- [ ] Performance metrics good
- [ ] User engagement normal
- [ ] No unusual spike in support tickets

### Feedback Review

- [ ] User feedback positive
- [ ] No major complaints in support
- [ ] Team satisfied with release

### Cleanup

- [ ] Delete release branch
  ```bash
  git branch -d release/v1.x.x
  git push origin --delete release/v1.x.x
  ```

- [ ] Archive release notes
- [ ] Update version in docs
- [ ] Plan next release

---

## Release Notes Template

```markdown
# Release v1.x.x

**Date:** 2026-05-20
**Status:** ✅ Stable

## What's New

### Features
- Feature 1 description
- Feature 2 description

### Bug Fixes
- Fixed issue #123
- Fixed issue #456

### Performance
- Improved page load by 20%
- Optimized database queries

### Security
- Patched vulnerability XYZ
- Updated security headers

## Migration Guide

### For Users
- No action needed

### For Developers
- Environment variable changed: OLD → NEW

## Known Issues
- Issue 1 (scheduled fix: v1.x+1)
- Issue 2 (workaround: ...)

## Special Thanks
- @developer-name for feature X
- @reviewer for thorough review

---

**Deployment Duration:** 5 minutes  
**Downtime:** 0 seconds  
**Status:** [Product Status Page](https://status.lodgra.io)
```

---

## Tools & Resources

### Monitoring During Release
- [Sentry Dashboard](https://sentry.io/) — Error tracking
- [Vercel Analytics](https://vercel.com/) — Deployment metrics
- [Google Analytics](https://analytics.google.com/) — User behavior
- Slack — Team communication

### Rollback Tools
- Vercel Deployments → "Promote to Production"
- Database backups (contact ops)

### Documentation
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Development guide
- [Deployment Guide](ops/deployment.md) — Infrastructure details
- [Monitoring Guide](ops/monitoring.md) — Alert setup

---

## Emergency Contacts

| Role | Contact | Availability |
|------|---------|---------------|
| DevOps | @devops-team | During release |
| Database | @data-engineer | On-call |
| Security | security@lodgra.io | 24/7 |

---

## Lessons Learned

After each release, document:

- [ ] What went well
- [ ] What could improve
- [ ] Action items for next release
- [ ] Team feedback

Keep in `docs/releases/` for future reference.

---

## Version Numbering

Follow Semantic Versioning (MAJOR.MINOR.PATCH):

- **MAJOR:** Breaking changes (1.0.0 → 2.0.0)
- **MINOR:** New features (1.0.0 → 1.1.0)
- **PATCH:** Bug fixes (1.0.0 → 1.0.1)

Examples:
- `1.0.0` — Initial release
- `1.1.0` — Add new feature
- `1.1.1` — Fix bug in feature
- `2.0.0` — Major breaking change

---

**Last Updated:** 2026-05-20
