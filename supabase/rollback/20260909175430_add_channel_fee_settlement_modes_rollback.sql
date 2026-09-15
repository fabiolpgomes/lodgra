BEGIN;

ALTER TABLE public.channel_payouts
  DROP CONSTRAINT IF EXISTS channel_payouts_reconciled_settlement_check,
  DROP CONSTRAINT IF EXISTS channel_payouts_payment_settlement_check,
  DROP CONSTRAINT IF EXISTS channel_payouts_ota_settlement_check,
  DROP COLUMN IF EXISTS payment_processing_settlement,
  DROP COLUMN IF EXISTS ota_commission_settlement;

ALTER TABLE public.reservation_financial_snapshots
  DROP CONSTRAINT IF EXISTS reservation_financial_snapshots_complete_settlement_check,
  DROP CONSTRAINT IF EXISTS reservation_financial_snapshots_payment_settlement_check,
  DROP CONSTRAINT IF EXISTS reservation_financial_snapshots_ota_settlement_check,
  DROP COLUMN IF EXISTS payment_processing_settlement,
  DROP COLUMN IF EXISTS ota_commission_settlement;

COMMIT;
