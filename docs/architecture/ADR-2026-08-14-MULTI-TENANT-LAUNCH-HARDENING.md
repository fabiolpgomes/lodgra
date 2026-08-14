# ADR: Multi-Tenant Launch Hardening Strategy

**Date:** 2026-08-14
**Status:** Accepted — Option B

## Context

Production evidence shows schema drift, missing RLS policies, legacy Default
tenant fallbacks, broad service-role usage, and public privileged functions.
Paid launch requires demonstrable database-enforced tenant isolation.

## Options

1. Big-bang rewrite of all tenant boundaries.
2. Phased deny-by-default hardening with objective launch gates.
3. Application filters only.

## Decision

Choose option 2. Freeze new tenant debt, establish the database contract, then
harden onboarding, RLS, privileged paths, integrations, and launch verification
in bounded phases. Do not launch until all critical gates pass.

## Consequences

- Paid launch is explicitly blocked until the security gates are green.
- Legacy adapters coexist temporarily but are inventoried and assigned an owner.
- Migrations prioritize additive, reversible changes and capability preservation.
- Cross-tenant negative tests become mandatory CI artifacts.
- Option 3 is prohibited; option 1 remains a contingency if drift cannot be
  reconciled safely.

## Approval

- Owner: approved Option B on 2026-08-14
- Architect: accepted for phased implementation
- Security: pending
