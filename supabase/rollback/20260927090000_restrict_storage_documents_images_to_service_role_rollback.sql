-- Rollback de 20260927090000: recria as 7 policies de storage (estado da baseline 20260925000001).
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

