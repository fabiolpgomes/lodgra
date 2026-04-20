-- Cleaning Checklists
-- Mobile-first feature for field team coordination

create table if not exists cleaning_checklists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  scheduled_date date not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cleaning_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references cleaning_checklists(id) on delete cascade,
  label text not null,
  is_done boolean not null default false,
  done_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Default item templates per property (optional, for quick creation)
create table if not exists cleaning_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade, -- null = org default
  items jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- RLS
alter table cleaning_checklists enable row level security;
alter table cleaning_checklist_items enable row level security;
alter table cleaning_templates enable row level security;

-- cleaning_checklists: org members can view their org's checklists
create policy "org members view checklists"
  on cleaning_checklists for select
  using (
    organization_id in (
      select organization_id from user_profiles where id = auth.uid()
    )
  );

-- admins/managers can insert/update
create policy "managers manage checklists"
  on cleaning_checklists for all
  using (
    organization_id in (
      select organization_id from user_profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- assigned user can update their own checklist (field staff)
create policy "assigned user update checklist"
  on cleaning_checklists for update
  using (assigned_to = auth.uid());

-- checklist items: follow parent checklist access
create policy "checklist items access"
  on cleaning_checklist_items for all
  using (
    checklist_id in (
      select id from cleaning_checklists
      where organization_id in (
        select organization_id from user_profiles where id = auth.uid()
      )
    )
  );

-- templates
create policy "org templates access"
  on cleaning_templates for all
  using (
    organization_id in (
      select organization_id from user_profiles where id = auth.uid()
    )
  );

-- Indexes
create index if not exists idx_cleaning_checklists_property on cleaning_checklists(property_id);
create index if not exists idx_cleaning_checklists_date on cleaning_checklists(scheduled_date);
create index if not exists idx_cleaning_checklists_status on cleaning_checklists(status);
create index if not exists idx_cleaning_checklists_assigned on cleaning_checklists(assigned_to);
create index if not exists idx_cleaning_items_checklist on cleaning_checklist_items(checklist_id);

-- Insert default template items (common for STR)
-- (applied when no property-specific template exists)
comment on table cleaning_checklists is 'Mobile-first cleaning task management for field teams';
comment on table cleaning_checklist_items is 'Individual items within a cleaning checklist';
comment on table cleaning_templates is 'Reusable item templates per property or organization';
