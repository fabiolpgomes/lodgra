-- Débito técnico: policies de storage permissivas ou mortas (auditoria 25/09/2026, RELATORIO.md §6).
--
-- property-documents: SELECT/INSERT/DELETE liberados para QUALQUER usuário autenticado,
--   sem isolamento por organização (vazamento cross-tenant). O app só acessa esse bucket
--   pelo service role nas rotas /api/properties/[id]/documents (que já validam organização),
--   então nenhuma policy para authenticated é necessária.
-- property-images: as 4 policies "107eh68_0" dependem de claims inexistentes no JWT
--   (role, custom_claims_role, organization_id) e não são usadas: upload/remoção passam
--   pelo service role e a leitura é pública (bucket público).
--
-- Resultado: acesso direto via chave publishable fica negado; service role (API) continua.

drop policy if exists property_documents_storage_select on storage.objects;
drop policy if exists property_documents_storage_insert on storage.objects;
drop policy if exists property_documents_storage_delete on storage.objects;

drop policy if exists "Allow admins to delete images 107eh68_0" on storage.objects;
drop policy if exists "Allow managers to upload images 107eh68_0" on storage.objects;
drop policy if exists "Allow public access for public properties 107eh68_0" on storage.objects;
drop policy if exists "Allow users to view organization images 107eh68_0" on storage.objects;
