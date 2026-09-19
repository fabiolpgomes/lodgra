-- Close the remaining two items from the pre-launch RLS audit
-- (audit started in 20260919125720 / 20260919125730, continued in
-- 20260919131315).
--
-- 1) property_reviews_select was `USING (true)` — anyone, authenticated
--    or not, could read the reviews of any property in any organization,
--    including non-public/internal properties. Now: readable when the
--    viewer's organization owns the review, or when the linked property
--    is public (mirrors the is_public exposure pattern used everywhere
--    else, e.g. properties_public_select).
--
-- 2) property_images had two separate problems:
--
--    a) property_images_update_manager_or_admin's WITH CHECK tried to
--       make original_filename/file_size_bytes immutable by comparing
--       them to a subquery, but the subquery compared property_images_1
--       to itself (`property_images_1.id = property_images_1.id`,
--       always true) instead of to the row being updated. Once the
--       table held more than one row this made the subquery return
--       multiple rows, which Postgres rejects as a scalar expression —
--       breaking every UPDATE to property_images with a runtime error.
--       Real immutability for these two columns is now enforced by a
--       BEFORE UPDATE trigger instead, which has clean access to
--       OLD/NEW, rather than a fragile self-referencing RLS subquery.
--
--    b) property_images_insert_manager_or_admin,
--       property_images_update_manager_or_admin (before this migration)
--       and property_images_delete_admin_only were named after specific
--       roles but their `qual`/`with_check` only checked organization_id
--       — any organization member, including a 'viewer', could upload,
--       edit or delete property images. Added the role checks the
--       policy names always implied (admin/manager/gestor for
--       insert+update, admin only for delete), matching the
--       admin/gestor gating used for writes elsewhere (properties,
--       reservations, expenses, ...).
--
-- Verified on staging and production via pg_policies before and after.

-- (1) property_reviews
DROP POLICY IF EXISTS property_reviews_select ON public.property_reviews;

CREATE POLICY property_reviews_select
ON public.property_reviews FOR SELECT
USING (
  organization_id = public.get_user_organization_id()
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_reviews.property_id AND p.is_public = true AND p.deleted_at IS NULL
  )
);

-- (2) property_images
DROP POLICY IF EXISTS property_images_insert_manager_or_admin ON public.property_images;
CREATE POLICY property_images_insert_manager_or_admin
ON public.property_images FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = ANY (ARRAY['admin', 'manager', 'gestor']))
);

DROP POLICY IF EXISTS property_images_update_manager_or_admin ON public.property_images;
CREATE POLICY property_images_update_manager_or_admin
ON public.property_images FOR UPDATE
USING (
  organization_id = public.get_user_organization_id()
  AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = ANY (ARRAY['admin', 'manager', 'gestor']))
)
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = ANY (ARRAY['admin', 'manager', 'gestor']))
);

DROP POLICY IF EXISTS property_images_delete_admin_only ON public.property_images;
CREATE POLICY property_images_delete_admin_only
ON public.property_images FOR DELETE
USING (
  organization_id = public.get_user_organization_id()
  AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
);

CREATE OR REPLACE FUNCTION public.prevent_property_images_immutable_field_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.original_filename IS DISTINCT FROM OLD.original_filename THEN
    RAISE EXCEPTION 'original_filename cannot be changed after upload';
  END IF;
  IF NEW.file_size_bytes IS DISTINCT FROM OLD.file_size_bytes THEN
    RAISE EXCEPTION 'file_size_bytes cannot be changed after upload';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_property_images_immutable_fields ON public.property_images;
CREATE TRIGGER trg_property_images_immutable_fields
BEFORE UPDATE ON public.property_images
FOR EACH ROW
EXECUTE FUNCTION public.prevent_property_images_immutable_field_changes();
