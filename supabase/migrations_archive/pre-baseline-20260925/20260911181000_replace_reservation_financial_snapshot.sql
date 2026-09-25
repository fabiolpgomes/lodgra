BEGIN;

CREATE OR REPLACE FUNCTION public.replace_reservation_financial_snapshot(
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_role text;
  v_reservation public.reservations%ROWTYPE;
  v_current public.reservation_financial_snapshots%ROWTYPE;
  v_new public.reservation_financial_snapshots%ROWTYPE;
  v_version integer;
  v_status text;
  v_required_missing boolean;
  v_compatibility text := 'legacy_not_synced';
BEGIN
  SELECT up.organization_id, up.role INTO v_org_id, v_role
  FROM public.user_profiles up WHERE up.id = v_user_id;

  IF v_user_id IS NULL OR v_org_id IS NULL OR v_role NOT IN ('admin', 'gestor') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'FINANCIAL_FACTS_FORBIDDEN';
  END IF;

  SELECT r.* INTO v_reservation
  FROM public.reservations r
  WHERE r.id = p_reservation_id
    AND r.organization_id = v_org_id
    AND public.user_has_property_access(r.property_id)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'FINANCIAL_FACTS_NOT_FOUND';
  END IF;

  IF p_fact_mode NOT IN ('component_breakdown', 'declared_owner_base')
     OR p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$'
     OR p_currency IS DISTINCT FROM COALESCE(v_reservation.currency, p_currency)
     OR length(COALESCE(p_note, '')) > 2000
     OR p_ota_commission_settlement NOT IN ('withheld','invoiced_separately','not_applicable','unknown')
     OR p_payment_processing_settlement NOT IN ('withheld','invoiced_separately','not_applicable','unknown')
     OR (p_fact_mode = 'declared_owner_base' AND p_declared_owner_base_amount IS NULL)
     OR (p_fact_mode = 'component_breakdown' AND p_declared_owner_base_amount IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'FINANCIAL_FACTS_INVALID';
  END IF;

  SELECT s.* INTO v_current
  FROM public.reservation_financial_snapshots s
  WHERE s.organization_id = v_org_id AND s.reservation_id = p_reservation_id
    AND s.superseded_at IS NULL
  FOR UPDATE;

  IF FOUND THEN
    IF p_expected_current_version IS DISTINCT FROM v_current.version THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'FINANCIAL_FACTS_CONFLICT';
    END IF;
    v_version := v_current.version + 1;
    UPDATE public.reservation_financial_snapshots
      SET superseded_at = now()
      WHERE id = v_current.id AND superseded_at IS NULL;
  ELSE
    IF p_expected_current_version IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'FINANCIAL_FACTS_CONFLICT';
    END IF;
    v_version := 1;
  END IF;

  IF p_fact_mode = 'declared_owner_base' THEN
    v_status := 'complete';
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.regras_repasse rr
      JOIN public.payout_rule_components pc ON pc.payout_rule_id = rr.id AND pc.organization_id = rr.organization_id
      WHERE rr.organization_id = v_org_id AND rr.propriedade_id = v_reservation.property_id
        AND rr.vigencia_fim IS NULL AND rr.contract_version = 2
        AND (pc.commission_base_effect <> 'ignore' OR pc.owner_statement_effect <> 'ignore')
        AND CASE pc.component_code
          WHEN 'accommodation' THEN p_accommodation_amount
          WHEN 'cleaning_fee' THEN p_cleaning_fee_amount
          WHEN 'municipal_tax' THEN p_municipal_tax_amount
          WHEN 'other_guest_fees' THEN p_other_guest_fees_amount
          WHEN 'discount' THEN p_discount_amount
          WHEN 'ota_commission' THEN p_ota_commission_amount
          WHEN 'payment_processing_fee' THEN p_payment_processing_fee_amount
        END IS NULL
    ) INTO v_required_missing;
    v_status := CASE WHEN NOT v_required_missing
      AND p_guest_total_amount IS NOT NULL AND p_channel_net_payout_amount IS NOT NULL
      AND p_ota_commission_settlement <> 'unknown'
      AND p_payment_processing_settlement <> 'unknown'
      THEN 'complete' ELSE 'pending' END;
  END IF;

  INSERT INTO public.reservation_financial_snapshots (
    organization_id, property_id, reservation_id, version, status, currency, fact_mode,
    declared_owner_base_amount, accommodation_amount, cleaning_fee_amount, municipal_tax_amount,
    other_guest_fees_amount, discount_amount, platform_adjustment_amount, guest_total_amount,
    ota_commission_base_amount, ota_commission_amount, payment_processing_fee_amount,
    manager_cleaning_cost_amount, channel_net_payout_amount, ota_commission_settlement,
    payment_processing_settlement, source_kind, provider, external_reference,
    source_metadata, source_mapping_version, captured_at, created_by
  ) VALUES (
    v_org_id, v_reservation.property_id, p_reservation_id, v_version, v_status, p_currency, p_fact_mode,
    p_declared_owner_base_amount, p_accommodation_amount, p_cleaning_fee_amount, p_municipal_tax_amount,
    p_other_guest_fees_amount, p_discount_amount, p_platform_adjustment_amount, p_guest_total_amount,
    p_ota_commission_base_amount, p_ota_commission_amount, p_payment_processing_fee_amount,
    p_manager_cleaning_cost_amount, p_channel_net_payout_amount, p_ota_commission_settlement,
    p_payment_processing_settlement, 'manual', NULLIF(v_reservation.booking_source, ''),
    COALESCE(v_reservation.external_reservation_id, v_reservation.external_id),
    jsonb_build_object('note', NULLIF(btrim(p_note), '')), 'manual-v1', now(), v_user_id
  ) RETURNING * INTO v_new;

  IF p_fact_mode = 'declared_owner_base'
     AND (v_reservation.booking_source = 'manual' OR v_reservation.booking_source LIKE 'ical%') THEN
    UPDATE public.reservations SET total_amount = p_declared_owner_base_amount, updated_at = now()
    WHERE id = p_reservation_id AND organization_id = v_org_id;
    v_compatibility := 'legacy_synced';
  ELSIF p_fact_mode = 'declared_owner_base' THEN
    v_compatibility := 'legacy_divergence_visible';
  END IF;

  INSERT INTO public.audit_logs(user_id, action, resource_type, resource_id, details)
  VALUES (v_user_id, 'update', 'reservation_financial_snapshot', v_new.id::text,
    jsonb_build_object('reservation_id', p_reservation_id, 'version', v_version,
      'fact_mode', p_fact_mode, 'compatibility', v_compatibility));

  RETURN jsonb_build_object('snapshot_id', v_new.id, 'version', v_version,
    'status', v_status, 'compatibility', v_compatibility);
EXCEPTION
  WHEN check_violation OR numeric_value_out_of_range OR invalid_text_representation THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'FINANCIAL_FACTS_INVALID';
END;
$$;

REVOKE ALL ON FUNCTION public.replace_reservation_financial_snapshot(
  uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  numeric,numeric,numeric,numeric,numeric,text,text,text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_reservation_financial_snapshot(
  uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  numeric,numeric,numeric,numeric,numeric,text,text,text
) TO authenticated, service_role;

COMMIT;
