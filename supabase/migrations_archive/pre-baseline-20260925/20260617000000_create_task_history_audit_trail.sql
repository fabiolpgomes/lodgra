-- Create task_history table for audit trail (Story 29.7/29.8)
CREATE TABLE IF NOT EXISTS public.task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES cleaning_tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- What changed
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'reverted', 'deleted'
  field_name VARCHAR(100), -- which field changed (e.g., 'status', 'notes')
  old_value TEXT,
  new_value TEXT,

  -- Why changed
  reason VARCHAR(500), -- Manager's reason for change

  -- Context
  full_snapshot JSONB -- Full task state at time of change
);

-- Indexes for fast queries
CREATE INDEX idx_task_history_task_id ON public.task_history(task_id);
CREATE INDEX idx_task_history_organization_id ON public.task_history(organization_id);
CREATE INDEX idx_task_history_changed_at ON public.task_history(changed_at DESC);
CREATE INDEX idx_task_history_changed_by ON public.task_history(changed_by);

-- RLS policies
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view their task history"
  ON public.task_history
  FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert task history"
  ON public.task_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT SELECT, INSERT ON public.task_history TO authenticated;
GRANT SELECT, INSERT ON public.task_history TO anon;
