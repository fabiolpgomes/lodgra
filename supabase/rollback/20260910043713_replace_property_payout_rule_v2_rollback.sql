BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.regras_repasse WHERE contract_version = 2) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'ROLLBACK_REQUIRES_V2_RULE_REMEDIATION';
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.replace_property_payout_rule_v2(
  uuid, uuid, date, public.tipo_comissao_repasse, numeric, numeric,
  text, text, text, boolean, smallint, jsonb, text
);
DROP FUNCTION IF EXISTS lodgra_private.replace_property_payout_rule_v2(
  uuid, uuid, date, public.tipo_comissao_repasse, numeric, numeric,
  text, text, text, boolean, smallint, jsonb, text
);

CREATE OR REPLACE FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.contract_version = 2 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYOUT_V2_MUTATION_REQUIRED';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure() IS
  'Temporary fail-closed gate: every v2 rule mutation is blocked until the reviewed transactional v2 RPC is installed.';

ALTER TABLE public.regras_repasse
  DROP CONSTRAINT IF EXISTS regras_repasse_contract_payload_check,
  ALTER COLUMN base_comissao SET DEFAULT 'faturamento_propriedade',
  ALTER COLUMN base_comissao SET NOT NULL,
  ALTER COLUMN taxa_limpeza_para SET DEFAULT 'gestor',
  ALTER COLUMN taxa_limpeza_para SET NOT NULL,
  ALTER COLUMN comissao_ota_por_conta SET DEFAULT 'proprietario',
  ALTER COLUMN comissao_ota_por_conta SET NOT NULL;

COMMIT;
