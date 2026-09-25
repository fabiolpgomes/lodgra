-- Complemento da baseline: objetos de produção que o `supabase db dump` não exporta
-- (trigger em auth, buckets/policies de storage, jobs do pg_cron).
-- Extraído de produção (brjumbfpvijrkhrherpt) em 25/09/2026. Idempotente.

-- 1) Trigger de criação de perfil no signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('property-images',    'property-images',    true,  10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('property-documents', 'property-documents', false, NULL,     NULL),
  ('cleaning-photos',    'cleaning-photos',    false, 2097152,  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 3) Policies de storage.objects (cópia fiel de produção)
DROP POLICY IF EXISTS "Allow admins to delete images 107eh68_0" ON storage.objects;
CREATE POLICY "Allow admins to delete images 107eh68_0" ON storage.objects
  FOR DELETE TO authenticated
  USING ((bucket_id = 'property-images') AND ((auth.jwt() ->> 'role') = 'admin')
    AND (((auth.jwt() ->> 'organization_id'))::uuid = (SELECT properties.organization_id FROM public.properties WHERE properties.id = (objects.path_tokens[2])::uuid)));

DROP POLICY IF EXISTS "Allow managers to upload images 107eh68_0" ON storage.objects;
CREATE POLICY "Allow managers to upload images 107eh68_0" ON storage.objects
  FOR INSERT TO public
  WITH CHECK ((bucket_id = 'property-images') AND ((auth.jwt() ->> 'custom_claims_role') = ANY (ARRAY['admin','gestor']))
    AND (((auth.jwt() ->> 'organization_id'))::uuid = (SELECT properties.organization_id FROM public.properties WHERE properties.id = (objects.path_tokens[2])::uuid)));

DROP POLICY IF EXISTS "Allow public access for public properties 107eh68_0" ON storage.objects;
CREATE POLICY "Allow public access for public properties 107eh68_0" ON storage.objects
  FOR SELECT TO authenticated
  USING ((bucket_id = 'property-images') AND ((SELECT properties.is_public FROM public.properties WHERE properties.id = (objects.path_tokens[2])::uuid) = true));

DROP POLICY IF EXISTS "Allow users to view organization images 107eh68_0" ON storage.objects;
CREATE POLICY "Allow users to view organization images 107eh68_0" ON storage.objects
  FOR SELECT TO authenticated
  USING ((bucket_id = 'property-images') AND ((auth.jwt() ->> 'role') IS NOT NULL)
    AND (((auth.jwt() ->> 'organization_id'))::uuid IN (SELECT properties.organization_id FROM public.properties WHERE properties.id = (objects.path_tokens[2])::uuid)));

-- ATENÇÃO (ver RELATORIO.md §6): estas 3 policies não isolam por organização.
DROP POLICY IF EXISTS property_documents_storage_select ON storage.objects;
CREATE POLICY property_documents_storage_select ON storage.objects
  FOR SELECT TO public USING ((bucket_id = 'property-documents') AND (auth.role() = 'authenticated'));
DROP POLICY IF EXISTS property_documents_storage_insert ON storage.objects;
CREATE POLICY property_documents_storage_insert ON storage.objects
  FOR INSERT TO public WITH CHECK ((bucket_id = 'property-documents') AND (auth.role() = 'authenticated'));
DROP POLICY IF EXISTS property_documents_storage_delete ON storage.objects;
CREATE POLICY property_documents_storage_delete ON storage.objects
  FOR DELETE TO public USING ((bucket_id = 'property-documents') AND (auth.role() = 'authenticated'));

-- 4) Jobs do pg_cron (o segredo vem do Vault: 'lodgra_cron_secret' precisa existir)
SELECT cron.schedule('email-parser-15min', '*/15 * * * *', $$SELECT net.http_get(url := 'https://www.lodgra.io/api/cron/email-parser', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'lodgra_cron_secret')), timeout_milliseconds := 300000) AS request_id$$);
SELECT cron.schedule('sync-ical-15min', '*/15 * * * *', $$SELECT net.http_get(url := 'https://www.lodgra.io/api/cron/sync-ical', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'lodgra_cron_secret')), timeout_milliseconds := 300000) AS request_id$$);
SELECT cron.schedule('enrich-reservations-15min', '*/15 * * * *', $$SELECT net.http_get(url := 'https://www.lodgra.io/api/cron/enrich-reservations', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'lodgra_cron_secret')), timeout_milliseconds := 300000) AS request_id$$);
