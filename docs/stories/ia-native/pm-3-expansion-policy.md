# IA Native Expansion Policy

**Purpose:** define how future Lodgra features are classified after the IA Native MVP is integrated.

## 1. Classification Model

### Core
- transversal to the platform
- shared by multiple modules
- required for tenancy, security, identity, currency, timezone or governance

### Capability
- bounded user-facing value stream
- independently enable-able / disable-able
- may have its own entry, state and lifecycle

### Extension
- narrower addition inside an existing module or capability
- does not redefine the product structure
- does not need a new shell entry

## 2. Decision Checklist

Before a new feature is accepted, answer:
- which user or organization needs this?
- which module owns it?
- is it core, capability or extension?
- does it require its own state machine?
- does it need its own validation wave?
- can it be disabled without breaking the platform?
- does it introduce shared logic that should move to core?

## 3. Validation Thresholds

### A feature becomes a capability only if:
- it has clear product value
- it has a defined owner and audience
- it can be isolated and rolled back
- it can be validated without opening the whole core
- it does not duplicate an existing module boundary

### A feature stays an extension if:
- it is scoped inside an existing module
- it does not require a new entry point
- it does not change the platform mental model

### A feature belongs in core only if:
- multiple modules need it
- leaving it out would cause duplication or inconsistency
- it governs identity, security, tenancy, currency, timezone or platform-wide policy

## 4. Governance Rules

- every future feature must declare module, audience and impact
- every future feature must declare whether it changes navigation
- every future feature must declare whether it needs a new wave
- every future feature must declare lifecycle and rollback expectations
- no feature may silently expand the core without review

## 5. Roadmap Rule

Prefer this order:
1. keep the current MVP stable
2. add extensions inside existing modules first
3. promote repeated shared concerns to core only when proven
4. introduce new capabilities only when they are clearly bounded and roll back safely

## 6. Examples

- `Property Intelligence` = capability
- currency conversion utility = core
- new report filter inside Property Intelligence = extension
- new owner-facing AI module = capability
- extra field in the same analysis flow = extension

## 7. QA Gate Reminder

The next QA gate should verify:
- classification is unambiguous
- rollback expectations are explicit
- navigation changes are justified
- scope creep is blocked before it reaches the core
