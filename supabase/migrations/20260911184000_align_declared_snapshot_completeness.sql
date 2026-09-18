BEGIN;

ALTER TABLE public.reservation_financial_snapshots
  DROP CONSTRAINT reservation_financial_snapshots_complete_settlement_check,
  ADD CONSTRAINT reservation_financial_snapshots_complete_settlement_check
    CHECK (
      status <> 'complete'
      OR fact_mode = 'declared_owner_base'
      OR (
        ota_commission_settlement <> 'unknown'
        AND payment_processing_settlement <> 'unknown'
      )
    ) NOT VALID;

COMMIT;
