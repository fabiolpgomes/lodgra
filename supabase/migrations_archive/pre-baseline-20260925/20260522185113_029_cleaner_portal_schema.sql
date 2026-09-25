-- Epic 29: Cleaner Operations Portal Schema
-- Tables: cleaning_tasks, cleaning_checklist_templates, cleaning_checklist_items, cleaning_checklist_responses, cleaning_photos, cleaner_access_tokens
-- RLS: All tables isolated by organization_id

-- Step 1: Update user_profiles guest_type enum to include 'cleaner'
ALTER TYPE guest_type ADD VALUE 'cleaner' BEFORE 'staff';

-- Step 2: Create cleaning_tasks table
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

-- Step 3: Create cleaning_checklist_templates table
CREATE TABLE IF NOT EXISTS cleaning_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 4: Create cleaning_checklist_items table
CREATE TABLE IF NOT EXISTS cleaning_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES cleaning_checklist_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT,
  is_required BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 5: Create cleaning_checklist_responses table
CREATE TABLE IF NOT EXISTS cleaning_checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES cleaning_tasks(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES cleaning_checklist_items(id) ON DELETE CASCADE,
  is_checked BOOLEAN DEFAULT false,
  notes TEXT,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, item_id)
);

-- Step 6: Create cleaning_photos table
CREATE TABLE IF NOT EXISTS cleaning_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES cleaning_tasks(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  uploader_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  caption TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 7: Create cleaner_access_tokens table
CREATE TABLE IF NOT EXISTS cleaner_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 8: Enable RLS on all tables
ALTER TABLE cleaning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaner_access_tokens ENABLE ROW LEVEL SECURITY;

-- Step 9: RLS Policies for cleaning_tasks
CREATE POLICY "cleaning_tasks_select" ON cleaning_tasks
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM user_profiles
      WHERE organization_id = cleaning_tasks.organization_id
    )
  );

CREATE POLICY "cleaning_tasks_insert" ON cleaning_tasks
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM user_profiles
      WHERE organization_id = cleaning_tasks.organization_id
        AND guest_type IN ('owner', 'staff')
    )
  );

CREATE POLICY "cleaning_tasks_update" ON cleaning_tasks
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM user_profiles
      WHERE organization_id = cleaning_tasks.organization_id
    )
  );

-- Step 10: RLS Policies for cleaning_checklist_templates
CREATE POLICY "cleaning_checklist_templates_select" ON cleaning_checklist_templates
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM user_profiles
      WHERE organization_id = cleaning_checklist_templates.organization_id
    )
  );

CREATE POLICY "cleaning_checklist_templates_insert" ON cleaning_checklist_templates
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM user_profiles
      WHERE organization_id = cleaning_checklist_templates.organization_id
        AND guest_type IN ('owner', 'staff')
    )
  );

CREATE POLICY "cleaning_checklist_templates_update" ON cleaning_checklist_templates
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM user_profiles
      WHERE organization_id = cleaning_checklist_templates.organization_id
        AND guest_type IN ('owner', 'staff')
    )
  );

-- Step 11: RLS Policies for cleaning_checklist_items
CREATE POLICY "cleaning_checklist_items_select" ON cleaning_checklist_items
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM cleaning_checklist_templates
      WHERE auth.uid() IN (
        SELECT id FROM user_profiles
        WHERE organization_id = cleaning_checklist_templates.organization_id
      )
    )
  );

CREATE POLICY "cleaning_checklist_items_insert" ON cleaning_checklist_items
  FOR INSERT WITH CHECK (
    template_id IN (
      SELECT id FROM cleaning_checklist_templates
      WHERE auth.uid() IN (
        SELECT id FROM user_profiles
        WHERE organization_id = cleaning_checklist_templates.organization_id
          AND guest_type IN ('owner', 'staff')
      )
    )
  );

-- Step 12: RLS Policies for cleaning_checklist_responses
CREATE POLICY "cleaning_checklist_responses_select" ON cleaning_checklist_responses
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM cleaning_tasks
      WHERE auth.uid() IN (
        SELECT id FROM user_profiles
        WHERE organization_id = cleaning_tasks.organization_id
      )
    )
  );

CREATE POLICY "cleaning_checklist_responses_insert" ON cleaning_checklist_responses
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM cleaning_tasks
      WHERE auth.uid() IN (
        SELECT id FROM user_profiles
        WHERE organization_id = cleaning_tasks.organization_id
      )
    )
  );

CREATE POLICY "cleaning_checklist_responses_update" ON cleaning_checklist_responses
  FOR UPDATE USING (
    task_id IN (
      SELECT id FROM cleaning_tasks
      WHERE auth.uid() IN (
        SELECT id FROM user_profiles
        WHERE organization_id = cleaning_tasks.organization_id
      )
    )
  );

-- Step 13: RLS Policies for cleaning_photos
CREATE POLICY "cleaning_photos_select" ON cleaning_photos
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM cleaning_tasks
      WHERE auth.uid() IN (
        SELECT id FROM user_profiles
        WHERE organization_id = cleaning_tasks.organization_id
      )
    )
  );

CREATE POLICY "cleaning_photos_insert" ON cleaning_photos
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM cleaning_tasks
      WHERE auth.uid() IN (
        SELECT id FROM user_profiles
        WHERE organization_id = cleaning_tasks.organization_id
      )
    )
  );

-- Step 14: RLS Policies for cleaner_access_tokens
CREATE POLICY "cleaner_access_tokens_select" ON cleaner_access_tokens
  FOR SELECT USING (
    cleaner_id = auth.uid() OR
    cleaner_id IN (
      SELECT id FROM user_profiles
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND guest_type IN ('owner', 'staff')
      )
    )
  );

CREATE POLICY "cleaner_access_tokens_insert" ON cleaner_access_tokens
  FOR INSERT WITH CHECK (
    cleaner_id IN (
      SELECT id FROM user_profiles
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND guest_type IN ('owner', 'staff')
      )
    )
  );

-- Step 15: Create indexes for common queries
CREATE INDEX idx_cleaning_tasks_org_id ON cleaning_tasks(organization_id);
CREATE INDEX idx_cleaning_tasks_cleaner_id ON cleaning_tasks(cleaner_id);
CREATE INDEX idx_cleaning_tasks_status ON cleaning_tasks(status);
CREATE INDEX idx_cleaning_checklist_templates_org_id ON cleaning_checklist_templates(organization_id);
CREATE INDEX idx_cleaning_checklist_responses_task_id ON cleaning_checklist_responses(task_id);
CREATE INDEX idx_cleaning_photos_task_id ON cleaning_photos(task_id);
CREATE INDEX idx_cleaner_access_tokens_cleaner_id ON cleaner_access_tokens(cleaner_id);
CREATE INDEX idx_cleaner_access_tokens_token ON cleaner_access_tokens(token);
CREATE INDEX idx_cleaner_access_tokens_expires_at ON cleaner_access_tokens(expires_at);
