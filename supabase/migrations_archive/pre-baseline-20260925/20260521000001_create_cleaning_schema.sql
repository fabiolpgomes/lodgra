-- Migration: Cleaner Operations Portal Schema Foundation
-- Date: 2026-05-21
-- Purpose: Create tables, RLS policies, indices, and storage for cleaning module

-- ============================================================================
-- 1. UPDATE user_profiles enum for guest_type
-- ============================================================================

-- Add 'cleaner' to guest_type enum if it doesn't exist
-- (assuming enum already exists with 'staff', 'owner')
DO $$
BEGIN
  BEGIN
    ALTER TYPE guest_type ADD VALUE 'cleaner';
  EXCEPTION WHEN others THEN
    -- Type may already have 'cleaner' value
    NULL;
  END;
END $$;

-- ============================================================================
-- 2. CREATE cleaning_tasks TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cleaning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  cleaner_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  checklist_template_id UUID REFERENCES cleaning_checklist_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'issue')),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for common queries
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_org_property
  ON cleaning_tasks(organization_id, property_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_org_cleaner_date
  ON cleaning_tasks(organization_id, cleaner_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_status
  ON cleaning_tasks(status);

-- RLS for cleaning_tasks
ALTER TABLE cleaning_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY cleaning_tasks_select_by_org
  ON cleaning_tasks FOR SELECT
  USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY cleaning_tasks_insert_by_manager
  ON cleaning_tasks FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );
CREATE POLICY cleaning_tasks_update_by_manager
  ON cleaning_tasks FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager'))
  WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY cleaning_tasks_delete_by_manager
  ON cleaning_tasks FOR DELETE
  USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager'));

-- ============================================================================
-- 3. CREATE cleaning_checklist_templates TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cleaning_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_cleaning_templates_org
  ON cleaning_checklist_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_templates_property
  ON cleaning_checklist_templates(property_id);

-- RLS
ALTER TABLE cleaning_checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY cleaning_templates_select_by_org
  ON cleaning_checklist_templates FOR SELECT
  USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY cleaning_templates_insert_by_manager
  ON cleaning_checklist_templates FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );
CREATE POLICY cleaning_templates_update_by_manager
  ON cleaning_checklist_templates FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager'))
  WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY cleaning_templates_delete_by_manager
  ON cleaning_checklist_templates FOR DELETE
  USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager'));

-- ============================================================================
-- 4. CREATE cleaning_checklist_items TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cleaning_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES cleaning_checklist_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT CHECK (category IN ('quarto', 'banheiro', 'cozinha', 'geral', NULL)),
  is_required BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_cleaning_items_template
  ON cleaning_checklist_items(template_id);

-- RLS (inherited through template_id)
ALTER TABLE cleaning_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY cleaning_items_select_through_template
  ON cleaning_checklist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cleaning_checklist_templates ct
      WHERE ct.id = template_id
      AND ct.organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY cleaning_items_insert_through_template
  ON cleaning_checklist_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cleaning_checklist_templates ct
      WHERE ct.id = template_id
      AND ct.organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
      AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager')
    )
  );
CREATE POLICY cleaning_items_update_through_template
  ON cleaning_checklist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cleaning_checklist_templates ct
      WHERE ct.id = template_id
      AND ct.organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
      AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cleaning_checklist_templates ct
      WHERE ct.id = template_id
      AND ct.organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY cleaning_items_delete_through_template
  ON cleaning_checklist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cleaning_checklist_templates ct
      WHERE ct.id = template_id
      AND ct.organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
      AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- 5. CREATE cleaning_checklist_responses TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cleaning_checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES cleaning_tasks(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES cleaning_checklist_items(id) ON DELETE CASCADE,
  is_done BOOLEAN DEFAULT false,
  done_at TIMESTAMPTZ,
  cleaner_notes TEXT
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_cleaning_responses_task
  ON cleaning_checklist_responses(task_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_responses_item
  ON cleaning_checklist_responses(item_id);

-- RLS (through task_id)
ALTER TABLE cleaning_checklist_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY cleaning_responses_select_through_task
  ON cleaning_checklist_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cleaning_tasks ct
      WHERE ct.id = task_id
      AND ct.organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY cleaning_responses_insert_through_task
  ON cleaning_checklist_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cleaning_tasks ct
      WHERE ct.id = task_id
      AND ct.organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY cleaning_responses_update_through_task
  ON cleaning_checklist_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cleaning_tasks ct
      WHERE ct.id = task_id
      AND ct.organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cleaning_tasks ct
      WHERE ct.id = task_id
      AND ct.organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- 6. CREATE cleaning_photos TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cleaning_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES cleaning_tasks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploader_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_task
  ON cleaning_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_uploaded
  ON cleaning_photos(task_id, uploaded_at DESC);

-- RLS (through task_id)
ALTER TABLE cleaning_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY cleaning_photos_select_through_task
  ON cleaning_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cleaning_tasks ct
      WHERE ct.id = task_id
      AND ct.organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY cleaning_photos_insert_through_task
  ON cleaning_photos FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cleaning_tasks ct
      WHERE ct.id = task_id
      AND ct.organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY cleaning_photos_delete_by_uploader
  ON cleaning_photos FOR DELETE
  USING (uploader_id = auth.uid());

-- ============================================================================
-- 7. CREATE cleaner_access_tokens TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cleaner_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_cleaner_tokens_hash
  ON cleaner_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_cleaner_tokens_cleaner
  ON cleaner_access_tokens(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_tokens_expires
  ON cleaner_access_tokens(expires_at);

-- RLS for access tokens (token hash is read-only)
ALTER TABLE cleaner_access_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY cleaner_tokens_select_own
  ON cleaner_access_tokens FOR SELECT
  USING (cleaner_id = auth.uid());
CREATE POLICY cleaner_tokens_insert_for_cleaner
  ON cleaner_access_tokens FOR INSERT
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager')
    AND cleaner_id IN (
      SELECT id FROM user_profiles
      WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY cleaner_tokens_update_on_use
  ON cleaner_access_tokens FOR UPDATE
  USING (cleaner_id = auth.uid())
  WITH CHECK (cleaner_id = auth.uid());

-- ============================================================================
-- 8. CREATE STORAGE BUCKET: cleaning-photos
-- ============================================================================

-- Insert bucket configuration (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, owner)
VALUES (
  'cleaning-photos',
  'cleaning-photos',
  false,
  2097152, -- 2MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp'],
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage bucket
CREATE POLICY cleaning_photos_bucket_select
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cleaning-photos'
    AND (storage.foldername(name))[1]::uuid = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY cleaning_photos_bucket_insert
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cleaning-photos'
    AND (storage.foldername(name))[1]::uuid = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY cleaning_photos_bucket_update
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'cleaning-photos'
    AND (storage.foldername(name))[1]::uuid = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (bucket_id = 'cleaning-photos'
    AND (storage.foldername(name))[1]::uuid = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY cleaning_photos_bucket_delete
  ON storage.objects FOR DELETE
  USING (bucket_id = 'cleaning-photos'
    AND (storage.foldername(name))[1]::uuid = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
