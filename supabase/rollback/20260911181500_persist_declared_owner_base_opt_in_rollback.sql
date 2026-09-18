BEGIN;
DROP FUNCTION IF EXISTS public.replace_property_payout_rule_v2(
  uuid,uuid,date,public.tipo_comissao_repasse,numeric,numeric,text,text,text,boolean,smallint,jsonb,text,boolean
);
DROP FUNCTION IF EXISTS public.create_property_payout_rule_v2(
  uuid,date,public.tipo_comissao_repasse,numeric,numeric,text,text,text,boolean,smallint,jsonb,text,boolean
);
DROP FUNCTION IF EXISTS lodgra_private.mutate_property_payout_rule_v2_with_declared(
  uuid,uuid,boolean,date,public.tipo_comissao_repasse,numeric,numeric,text,text,text,boolean,smallint,jsonb,text,boolean
);
COMMIT;
