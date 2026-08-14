# Lodgra Multi-Tenant Launch Hardening

**Version:** 0.2
**Date:** 2026-08-14
**Status:** Option B approved — implementation in progress
**Scope:** Stable paid-subscription launch

## Purpose

Establish a verifiable tenant-isolation contract for Lodgra before paid
subscriptions are sold. The database remains the final authorization boundary;
application filters improve UX but never replace RLS or tenant-aware foreign
keys.

## Current-state evidence

The production audit on 2026-08-14 invalidated the previous "complete"
assessment:

- `organizations` was restored with schema drift and initially had RLS without
  policies.
- At audit time, six tenant-scoped tables had RLS enabled but zero policies:
  `analytics_config_audit_log`, `cleaning_checklist_templates`,
  `google_feed_logs`, `organization_analytics_config`, and `raw_emails` plus
  the recently repaired `organizations` state captured before remediation.
- Post-remediation verification recorded in Story 31.7 returns zero
  RLS-enabled tables with `organization_id` and no policy.
- Nine public `SECURITY DEFINER` functions exist; six were executable by
  `anon` at audit time.
- Approximately 205 source files reference an admin client, service-role key,
  or privileged database path and require classification.
- Runtime routes and migrations still contain the legacy organization UUID
  `00000000-0000-0000-0000-000000000001`.
- Production migrations and the repository migration history have drifted.
- Cross-tenant negative tests are incomplete despite older documents claiming
  isolation was verified.

## Non-negotiable invariants

1. Every private business row belongs to exactly one `organization_id`.
2. Tenant ownership is derived from the authenticated profile or a verified
   external-event mapping, never from an untrusted request body.
3. Composite foreign keys prevent a child row from referencing a parent in a
   different organization.
4. Every exposed private table has RLS enabled and at least one tenant-scoped
   policy; missing policy is a release blocker, not a silent deny strategy.
5. `service_role` is limited to classified background/admin adapters. Each
   adapter resolves and asserts tenant context before data access.
6. Public endpoints may expose only explicitly public records and must resolve
   the organization from a trusted slug/domain/resource relationship.
7. Webhooks verify signatures first, then resolve tenant from stored connection
   metadata. Payload-provided tenant IDs are never authoritative.
8. New customer onboarding creates organization + first admin profile
   atomically. New customers are never assigned to the legacy Default tenant.
9. Plan changes are auditable and Stripe/webhook-driven, except explicit
   break-glass administration.
10. No release passes without automated Org A ↔ Org B denial tests.

## Architecture options

### Option A — Big-bang tenant rewrite

Replace all privileged paths, policies, onboarding, and billing in one release.

- **Pros:** shortest period with two patterns; clean final state.
- **Cons:** highest regression and rollback risk; 205 privileged touchpoints;
  difficult to prove feature preservation.
- **Launch impact:** long freeze; launch blocked until the entire rewrite lands.

### Option B — Phased deny-by-default hardening (recommended)

Define the database contract first, close critical isolation gaps in bounded
phases, and allow launch only when every gate in
`multi-tenant-launch-gates.yaml` is green.

- **Pros:** controlled blast radius, measurable progress, reversible migrations,
  earlier discovery of data drift, preserves current capabilities.
- **Cons:** temporary coexistence of legacy and hardened adapters; requires an
  explicit inventory and deprecation tracking.
- **Launch impact:** launch remains blocked, but each blocker has objective exit
  criteria.

### Option C — Application-filter hardening only

Add `.eq('organization_id', ...)` to routes without repairing database policy
and FK contracts.

- **Pros:** fastest visible changes.
- **Cons:** service-role mistakes remain catastrophic; no database isolation;
  cannot support a credible paid SaaS security claim.
- **Decision:** rejected as unsafe.

## Recommended architecture

```text
Authenticated request
  -> requireRole / tenant context resolver
  -> tenant-scoped repository (normal Supabase client)
  -> RLS + composite tenant foreign keys
  -> tenant-owned rows

Verified webhook / cron
  -> signature or Bearer verification
  -> stored connection/listing lookup
  -> explicit organization assertion
  -> narrowly scoped admin repository
  -> audit event + tenant-owned rows
```

### Components

| Component | Responsibility | Boundary |
|---|---|---|
| Tenant context | Resolve user, role, organization, property scope | Never accepts authoritative org from body |
| Tenant repository | Standard authenticated CRUD | RLS is mandatory |
| Privileged adapter | Webhook, cron, migration, support operation | Explicit org assertion + audit |
| Onboarding transaction | Create org and first admin atomically | No Default tenant fallback |
| Billing policy | Resolve subscription and limits | `subscription_plan` is source of truth |
| Isolation test harness | Org A/Org B positive and negative cases | Runs against disposable database |

## Delivery phases

### Phase 0 — Freeze and evidence

- Reconcile production schema against migrations.
- Inventory all public tables, RLS policies, grants, functions, storage buckets,
  service-role consumers, crons, and webhooks.
- Classify data as public, tenant-private, platform-internal, or shared reference.
- Prohibit new hardcoded Default tenant references.

### Phase 1 — Organization and onboarding foundation

- Establish one canonical `organizations` schema migration.
- Make `subscription_plan` the plan source of truth.
- Implement atomic organization + first-admin onboarding.
- Remove Default-tenant assignment from runtime flows.
- Preserve the legacy Default tenant only for explicitly mapped historical data.

### Phase 2 — Database isolation

- Add/verify `organization_id NOT NULL`, indexes, and composite tenant FKs.
- Replace permissive or missing policies with role- and tenant-scoped policies.
- Revoke unsafe function/table grants.
- Move internal-only objects out of exposed schemas where practical.

### Phase 3 — Privileged-path containment

- Classify the ~205 privileged references.
- Centralize narrow admin repositories by domain.
- Require tenant assertion and structured audit metadata.
- Remove public/debug/migration routes from production exposure.

### Phase 4 — External integrations

- Tenant-bind OTA listings, email accounts, Stripe customers, webhooks, and crons.
- Enforce idempotency keys scoped by organization and provider connection.
- Add dead-letter/review handling without cross-tenant fallback.

### Phase 5 — Launch verification

- Run database RLS tests and application integration tests with at least two
  organizations.
- Run Supabase security/performance advisors and resolve launch-scoped findings.
- Exercise signup → subscription → property → OTA reservation → billing.
- Validate backup/restore, rollback, monitoring, and incident runbooks.

## Test strategy

Critical tests are mandatory and must fail before the related fix is applied:

- Org A cannot SELECT/INSERT/UPDATE/DELETE Org B rows for every private table.
- Admin, gestor, viewer, cleaner, anonymous, cron, and webhook identities have
  explicit positive and negative matrices.
- A child row cannot mix `property_id` from Org A with `organization_id` from
  Org B.
- Onboarding failures roll back both organization and profile creation.
- Duplicate webhook/cron deliveries remain idempotent within a tenant.
- Premium remains unlimited; lower plans enforce configured limits per tenant.
- No service-role route succeeds without verified tenant context.

## Observability

Every privileged operation records: correlation ID, actor type, operation,
organization ID, resource type/ID, result, and sanitized error code. Secrets,
email bodies, iCal URLs, and tokens are never logged.

## Rollout and rollback

- Use additive columns/FKs as `NOT VALID`, backfill and audit, then validate.
- Deploy read compatibility before write cutover.
- Never disable RLS globally for migration convenience.
- Each phase has a reversible application switch and a database rollback plan;
  destructive cleanup occurs only after a full release cycle with evidence.

## Recorded decision

**Option B was approved by the product owner on 2026-08-14.** Implementation
proceeds phase-by-phase; paid launch remains blocked until every critical gate
is green.

## Approval

- Product/owner: approved Option B on 2026-08-14
- Architecture: accepted
- Security: pending after Phase 0 evidence
- Proceed to implementation: **YES, phase-by-phase**
