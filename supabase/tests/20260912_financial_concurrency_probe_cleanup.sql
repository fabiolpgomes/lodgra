-- Remove only the four authorized disposable fixtures and temporary probe API.
-- Keep the evidence query in the same transaction as its local setting.
BEGIN;

DO $cleanup$
DECLARE props uuid[]; rs uuid[]; ss uuid[]; rules uuid[]; before_counts jsonb;
BEGIN
SELECT array_agg(id) INTO props FROM public.properties
WHERE id IN ('81682c25-0cb3-4c4b-a316-529cabcc1408','6aab6bd2-9c81-4de8-99fa-c64818100fa8',
'576c5f79-3561-4b03-b10f-826075703952','b75c2363-fbcc-461b-8099-44210710d013')
AND name LIKE 'Story47.4-concurrency-authorized-20260912-%';
IF cardinality(props) IS DISTINCT FROM 4 THEN RAISE EXCEPTION 'Disposable fixture identity mismatch'; END IF;
SELECT array_agg(id) INTO rs FROM public.reservations WHERE property_id=ANY(props);
SELECT array_agg(id) INTO ss FROM public.reservation_financial_snapshots WHERE property_id=ANY(props);
SELECT array_agg(id) INTO rules FROM public.regras_repasse WHERE propriedade_id=ANY(props);
before_counts:=jsonb_build_object('properties',cardinality(props),'reservations',cardinality(rs),'snapshots',cardinality(ss),'rules',cardinality(rules),
'components',(select count(*) from public.payout_rule_components where payout_rule_id=ANY(rules)),
'audit_logs',(select count(*) from public.audit_logs where resource_id=ANY(props::text[]) OR resource_id=ANY(rs::text[])
OR resource_id=ANY(ss::text[]) OR resource_id=ANY(rules::text[]) OR details->>'reservation_id'=ANY(rs::text[])));
DELETE FROM public.audit_logs WHERE resource_id=ANY(props::text[]) OR resource_id=ANY(rs::text[]) OR resource_id=ANY(ss::text[])
OR resource_id=ANY(rules::text[]) OR details->>'reservation_id'=ANY(rs::text[]);
DELETE FROM public.reservation_financial_snapshots WHERE property_id=ANY(props);
PERFORM set_config('lodgra.v2_rule_replacement_txid',txid_current()::text,true);
DELETE FROM public.regras_repasse WHERE propriedade_id=ANY(props);
PERFORM set_config('lodgra.v2_rule_replacement_txid','',true);
DELETE FROM public.reservations WHERE property_id=ANY(props);
DELETE FROM public.properties WHERE id=ANY(props);
DROP FUNCTION public.story474_concurrency_probe(uuid,text,timestamptz,integer,integer,numeric);
IF EXISTS(SELECT 1 FROM public.properties WHERE id=ANY(props))
OR EXISTS(SELECT 1 FROM public.reservations WHERE id=ANY(rs) OR property_id=ANY(props))
OR EXISTS(SELECT 1 FROM public.reservation_financial_snapshots WHERE reservation_id=ANY(rs) OR property_id=ANY(props))
OR EXISTS(SELECT 1 FROM public.regras_repasse WHERE propriedade_id=ANY(props))
OR EXISTS(SELECT 1 FROM public.payout_rule_components WHERE payout_rule_id=ANY(rules))
OR EXISTS(SELECT 1 FROM public.audit_logs WHERE resource_id=ANY(props::text[]) OR resource_id=ANY(rs::text[])
OR resource_id=ANY(ss::text[]) OR resource_id=ANY(rules::text[]) OR details->>'reservation_id'=ANY(rs::text[]))
THEN RAISE EXCEPTION 'Disposable cleanup incomplete'; END IF;
PERFORM set_config('story474.cleanup',jsonb_build_object('removed',before_counts,'remaining',0,'probe_removed',true)::text,true);
END $cleanup$;
SELECT current_setting('story474.cleanup')::jsonb AS evidence,
to_regprocedure('public.story474_concurrency_probe(uuid,text,timestamptz,integer,integer,numeric)') AS probe;

COMMIT;
