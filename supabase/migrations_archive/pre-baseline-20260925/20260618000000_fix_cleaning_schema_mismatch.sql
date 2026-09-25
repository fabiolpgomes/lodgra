-- Fix schema mismatches between database and TypeScript types
-- Rename columns to match TypeScript interfaces

-- 1. Fix cleaning_checklist_responses table
ALTER TABLE cleaning_checklist_responses
RENAME COLUMN is_done TO is_checked;

ALTER TABLE cleaning_checklist_responses
RENAME COLUMN done_at TO checked_at;

ALTER TABLE cleaning_checklist_responses
RENAME COLUMN cleaner_notes TO notes;

-- Add missing timestamp fields
ALTER TABLE cleaning_checklist_responses
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Fix cleaning_photos table
ALTER TABLE cleaning_photos
RENAME COLUMN file_path TO storage_path;

-- Add missing fields
ALTER TABLE cleaning_photos
ADD COLUMN caption TEXT,
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Fix cleaner_access_tokens table
-- Note: token_hash is correctly hashed, no renaming needed
ALTER TABLE cleaner_access_tokens
ADD COLUMN is_used BOOLEAN DEFAULT FALSE,
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update RLS policies if needed (verify organization isolation still works)
-- The existing RLS should continue to work as it uses organization_id

-- Create indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_org_id_status
ON cleaning_tasks(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_cleaning_responses_task_id
ON cleaning_checklist_responses(task_id);

CREATE INDEX IF NOT EXISTS idx_cleaning_photos_task_id
ON cleaning_photos(task_id);

CREATE INDEX IF NOT EXISTS idx_access_tokens_hash
ON cleaner_access_tokens(token_hash);
