BEGIN;

SELECT plan(14);

SELECT has_schema('lodgra_private', 'schema privado existe');
SELECT has_function('public', 'replace_property_payout_rule', ARRAY[
  'uuid', 'uuid', 'date', 'tipo_comissao_repasse', 'numeric',
  'base_comissao_repasse', 'destinatario_taxa_repasse',
  'destinatario_taxa_repasse', 'boolean', 'smallint', 'text'
], 'RPC pública existe com assinatura única');
SELECT has_function('lodgra_private', 'replace_property_payout_rule', ARRAY[
  'uuid', 'uuid', 'date', 'tipo_comissao_repasse', 'numeric',
  'base_comissao_repasse', 'destinatario_taxa_repasse',
  'destinatario_taxa_repasse', 'boolean', 'smallint', 'text'
], 'helper privado existe');

SELECT function_privs_are(
  'public', 'replace_property_payout_rule', ARRAY[
    'uuid', 'uuid', 'date', 'tipo_comissao_repasse', 'numeric',
    'base_comissao_repasse', 'destinatario_taxa_repasse',
    'destinatario_taxa_repasse', 'boolean', 'smallint', 'text'
  ], 'anon', ARRAY[]::text[], 'anon não executa RPC'
);
SELECT function_privs_are(
  'public', 'replace_property_payout_rule', ARRAY[
    'uuid', 'uuid', 'date', 'tipo_comissao_repasse', 'numeric',
    'base_comissao_repasse', 'destinatario_taxa_repasse',
    'destinatario_taxa_repasse', 'boolean', 'smallint', 'text'
  ], 'authenticated', ARRAY['EXECUTE'], 'authenticated executa somente RPC'
);
SELECT table_privs_are('public', 'regras_repasse', 'anon', ARRAY[]::text[], 'anon sem grants');
SELECT table_privs_are('public', 'regras_repasse', 'authenticated', ARRAY['SELECT'], 'authenticated conserva somente leitura direta');
SELECT policies_are('public', 'regras_repasse', ARRAY[
  'regras_repasse_tenant_insert',
  'regras_repasse_tenant_select',
  'regras_repasse_tenant_update'
], 'policies de defesa em profundidade preservadas');
SELECT col_is_fk('public', 'regras_repasse', ARRAY['propriedade_id', 'organization_id'], 'FK composta preservada');
SELECT has_index('public', 'regras_repasse', 'regras_repasse_uma_vigente_por_propriedade', 'índice de regra aberta preservado');
SELECT has_index('public', 'regras_repasse', 'regras_repasse_historico_lookup', 'índice histórico preservado');
SELECT isnt_empty(
  $$SELECT 1 FROM pg_constraint WHERE conname = 'regras_repasse_vigencias_sem_sobreposicao' AND contype = 'x'$$,
  'exclusão de sobreposição preservada'
);
SELECT volatility_is('public', 'replace_property_payout_rule', ARRAY[
  'uuid', 'uuid', 'date', 'tipo_comissao_repasse', 'numeric',
  'base_comissao_repasse', 'destinatario_taxa_repasse',
  'destinatario_taxa_repasse', 'boolean', 'smallint', 'text'
], 'volatile', 'RPC é volatile');
SELECT security_type_is('public', 'replace_property_payout_rule', ARRAY[
  'uuid', 'uuid', 'date', 'tipo_comissao_repasse', 'numeric',
  'base_comissao_repasse', 'destinatario_taxa_repasse',
  'destinatario_taxa_repasse', 'boolean', 'smallint', 'text'
], 'invoker', 'RPC pública é security invoker');

SELECT * FROM finish();
ROLLBACK;
