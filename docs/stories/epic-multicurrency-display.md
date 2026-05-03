# Epic: Multi-Currency Display — Totalizar por Moeda

**Status:** Ready for Review
**Priority:** High
**Effort:** Medium
**Risk:** Low (no schema changes required)

## Problem Statement

The Lodgra system supports properties in multiple currencies (BRL, EUR, USD, etc.) but all financial screens sum values across currencies as if they were equal, producing incorrect totals and a confusing user experience.

## Goal

Every financial screen must group and display monetary values **per currency**. Never sum across currencies. The user must always see "R$ X | € Y" instead of a mixed incorrect total.

## Affected Screens

1. `/dashboard` — Revenue cards, RevenueChart
2. `/reservations` — "Valor" column totals
3. `/financial` — All aggregations and charts
4. `/reports` — Revenue tables, PDF exports
5. `/expenses` — Expense totals
6. `/owners/[id]/report` — Owner payout reports

## Acceptance Criteria

- [x] No screen sums values from different currencies
- [x] All financial totals displayed grouped by currency
- [x] Dashboard shows BRL and EUR revenue in separate cards/rows
- [x] Reports and PDF exports respect currency separation
- [x] Consistent visual pattern across all screens
- [x] Existing `groupByCurrency()` utility used throughout

## Constraints

- No database schema changes
- No new tables or migrations required
- Leverage existing `formatMultiCurrencyTotals()` and `groupByCurrency()` from `src/lib/utils/currency.ts`
- Minimal structural changes to components

## Stories

- [x] Story MC-1: Multi-currency aggregation pattern (Architect design)
- [x] Story MC-2: UI visual pattern for multi-currency display (UX design)
- [x] Story MC-3: Dashboard multi-currency implementation
- [x] Story MC-4: Financial page multi-currency implementation
- [x] Story MC-5: Reports + PDF multi-currency implementation

## Agents

- @architect — Query/aggregation pattern design
- @ux-design-expert — Visual pattern design
- @dev — Implementation across all screens

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes

- `/dashboard`, `/financial`, `/expenses`, `/reports/RevenueTable` already used `groupByCurrency()` + `CurrencyStack` correctly
- **Main fix:** `/owners/[id]/report` API was summing all currencies into one number. Added `summaryByCurrency` to response, updated page to render per-currency tfoot rows and `CurrencyStack` summary cards
- **Visual fix:** `/financial` property table now shows currency badge (EUR/BRL/USD/GBP) alongside property name
- CSV export now includes `Moeda` column and one TOTAL row per currency
- WhatsApp share handles multi-currency: single-currency compact format, multi-currency shows one line per currency
- `summaryByCurrency` has fallback computation from `properties` array for older API responses

### File List

**Modified:**
- `src/app/api/owners/[id]/report/route.ts` — Added `summaryByCurrency` field grouped by property currency
- `src/app/[locale]/owners/[id]/report/page.tsx` — Fixed display: CurrencyStack cards, per-currency tfoot, multi-currency WhatsApp/CSV, currency badge on property rows
- `src/app/[locale]/financial/page.tsx` — Added currency badge (EUR/BRL/USD/GBP) to "Análise por Propriedade" table

### Change Log

- 2026-05-03: Implemented multi-currency display fixes across owner report + financial page (Dex, claude-sonnet-4-6)
