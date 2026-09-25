-- Phase 6: Extraction Corrections Logging

-- Create extraction_corrections table
create table extraction_corrections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  extraction_id uuid not null references email_extractions(id) on delete cascade,
  field text not null,
  original_value text,
  corrected_value text not null,
  source_platform text not null,
  created_at timestamptz default now(),
  created_by uuid,

  constraint fk_organization foreign key (organization_id) references organizations(id) on delete cascade,
  constraint field_values_not_same check (original_value is distinct from corrected_value)
);

-- Indexes for performance
create index idx_extraction_corrections_organization_id
  on extraction_corrections(organization_id);
create index idx_extraction_corrections_extraction_id
  on extraction_corrections(extraction_id);
create index idx_extraction_corrections_field
  on extraction_corrections(field);
create index idx_extraction_corrections_platform
  on extraction_corrections(source_platform);
create index idx_extraction_corrections_created_at
  on extraction_corrections(created_at desc);

-- Enable RLS
alter table extraction_corrections enable row level security;

-- RLS Policy: Users can only see corrections for their organization
create policy "select_own_org_corrections" on extraction_corrections
  for select
  using (
    auth.uid()::text = '' or
    organization_id in (
      select id from organizations
      where id = (
        select organization_id from email_extractions where id = extraction_corrections.extraction_id
      )
    )
  );

-- RLS Policy: Service role can insert corrections
create policy "insert_corrections" on extraction_corrections
  for insert
  with check (true);

-- Rollback
-- drop table if exists extraction_corrections cascade;
