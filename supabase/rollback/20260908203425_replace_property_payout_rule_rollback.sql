BEGIN;

DROP FUNCTION IF EXISTS public.replace_property_payout_rule(
  uuid, uuid, date, public.tipo_comissao_repasse, numeric,
  public.base_comissao_repasse, public.destinatario_taxa_repasse,
  public.destinatario_taxa_repasse, boolean, smallint, text
);
DROP FUNCTION IF EXISTS lodgra_private.replace_property_payout_rule(
  uuid, uuid, date, public.tipo_comissao_repasse, numeric,
  public.base_comissao_repasse, public.destinatario_taxa_repasse,
  public.destinatario_taxa_repasse, boolean, smallint, text
);
-- Other features may still own objects in the shared private schema.
DO $$
BEGIN
  DROP SCHEMA IF EXISTS lodgra_private RESTRICT;
EXCEPTION
  WHEN dependent_objects_still_exist THEN
    RAISE NOTICE 'Preserving non-empty lodgra_private schema';
END;
$$;

GRANT INSERT, UPDATE ON TABLE public.regras_repasse TO authenticated;

COMMIT;
