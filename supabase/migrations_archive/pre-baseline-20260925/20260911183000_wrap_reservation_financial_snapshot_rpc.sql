BEGIN;

ALTER FUNCTION public.replace_reservation_financial_snapshot(
  uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  numeric,numeric,numeric,numeric,numeric,text,text,text
) SET SCHEMA lodgra_private;

CREATE FUNCTION public.replace_reservation_financial_snapshot(
  p_reservation_id uuid,
  p_expected_current_version integer,
  p_fact_mode text,
  p_currency text,
  p_declared_owner_base_amount numeric DEFAULT NULL,
  p_accommodation_amount numeric DEFAULT NULL,
  p_cleaning_fee_amount numeric DEFAULT NULL,
  p_municipal_tax_amount numeric DEFAULT NULL,
  p_other_guest_fees_amount numeric DEFAULT NULL,
  p_discount_amount numeric DEFAULT NULL,
  p_platform_adjustment_amount numeric DEFAULT NULL,
  p_guest_total_amount numeric DEFAULT NULL,
  p_ota_commission_base_amount numeric DEFAULT NULL,
  p_ota_commission_amount numeric DEFAULT NULL,
  p_payment_processing_fee_amount numeric DEFAULT NULL,
  p_manager_cleaning_cost_amount numeric DEFAULT NULL,
  p_channel_net_payout_amount numeric DEFAULT NULL,
  p_ota_commission_settlement text DEFAULT 'unknown',
  p_payment_processing_settlement text DEFAULT 'unknown',
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT lodgra_private.replace_reservation_financial_snapshot(
    p_reservation_id, p_expected_current_version, p_fact_mode, p_currency,
    p_declared_owner_base_amount, p_accommodation_amount, p_cleaning_fee_amount,
    p_municipal_tax_amount, p_other_guest_fees_amount, p_discount_amount,
    p_platform_adjustment_amount, p_guest_total_amount, p_ota_commission_base_amount,
    p_ota_commission_amount, p_payment_processing_fee_amount,
    p_manager_cleaning_cost_amount, p_channel_net_payout_amount,
    p_ota_commission_settlement, p_payment_processing_settlement, p_note
  );
$$;

REVOKE ALL ON FUNCTION lodgra_private.replace_reservation_financial_snapshot(
  uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  numeric,numeric,numeric,numeric,numeric,text,text,text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION lodgra_private.replace_reservation_financial_snapshot(
  uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  numeric,numeric,numeric,numeric,numeric,text,text,text
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.replace_reservation_financial_snapshot(
  uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  numeric,numeric,numeric,numeric,numeric,text,text,text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_reservation_financial_snapshot(
  uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  numeric,numeric,numeric,numeric,numeric,text,text,text
) TO authenticated, service_role;

COMMIT;
