BEGIN;

-- These checks already protect new writes. Validate historical rows as well;
-- any violating row aborts the transaction without changing financial data.
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.reservation_financial_snapshots
  VALIDATE CONSTRAINT reservation_financial_snapshots_complete_settlement_check;

ALTER TABLE public.channel_payouts
  VALIDATE CONSTRAINT channel_payouts_reconciled_settlement_check;

COMMIT;
