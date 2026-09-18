BEGIN;

ALTER TABLE public.reservation_financial_snapshots
  ADD COLUMN ota_commission_settlement text NOT NULL DEFAULT 'unknown',
  ADD COLUMN payment_processing_settlement text NOT NULL DEFAULT 'unknown',
  ADD CONSTRAINT reservation_financial_snapshots_ota_settlement_check
    CHECK (ota_commission_settlement IN (
      'withheld', 'invoiced_separately', 'not_applicable', 'unknown'
    )),
  ADD CONSTRAINT reservation_financial_snapshots_payment_settlement_check
    CHECK (payment_processing_settlement IN (
      'withheld', 'invoiced_separately', 'not_applicable', 'unknown'
    )),
  ADD CONSTRAINT reservation_financial_snapshots_complete_settlement_check
    CHECK (
      status <> 'complete'
      OR (
        ota_commission_settlement <> 'unknown'
        AND payment_processing_settlement <> 'unknown'
      )
    ) NOT VALID;

ALTER TABLE public.channel_payouts
  ADD COLUMN ota_commission_settlement text NOT NULL DEFAULT 'unknown',
  ADD COLUMN payment_processing_settlement text NOT NULL DEFAULT 'unknown',
  ADD CONSTRAINT channel_payouts_ota_settlement_check
    CHECK (ota_commission_settlement IN (
      'withheld', 'invoiced_separately', 'not_applicable', 'unknown'
    )),
  ADD CONSTRAINT channel_payouts_payment_settlement_check
    CHECK (payment_processing_settlement IN (
      'withheld', 'invoiced_separately', 'not_applicable', 'unknown'
    )),
  ADD CONSTRAINT channel_payouts_reconciled_settlement_check
    CHECK (
      reconciliation_status <> 'reconciled'
      OR (
        ota_commission_settlement <> 'unknown'
        AND payment_processing_settlement <> 'unknown'
      )
    ) NOT VALID;

COMMENT ON COLUMN public.reservation_financial_snapshots.ota_commission_settlement IS
  'Whether OTA commission was withheld from payout or invoiced separately; prevents double deduction.';
COMMENT ON COLUMN public.channel_payouts.ota_commission_settlement IS
  'Settlement mode used when reconciling observed channel net amount.';

COMMIT;
