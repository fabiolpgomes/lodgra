-- Phase 7: Feature flag for email-iCal reconciliation

-- Add feature flag columns to organizations table
alter table organizations
add column if not exists email_ical_reconciliation_enabled boolean default false,
add column if not exists email_ical_pilot_started_at timestamptz,
add column if not exists email_ical_pilot_platforms text[] default array['airbnb', 'booking'];

-- Add indexes for feature flag queries
create index if not exists idx_organizations_email_ical_enabled
  on organizations(email_ical_reconciliation_enabled);

-- Update function to track when pilot starts
create or replace function enable_email_ical_pilot(org_id uuid)
returns void as $$
begin
  update organizations
  set 
    email_ical_reconciliation_enabled = true,
    email_ical_pilot_started_at = now(),
    email_ical_pilot_platforms = array['airbnb', 'booking']
  where id = org_id;
end;
$$ language plpgsql;

-- View to get pilot organizations (for monitoring)
create or replace view pilot_organizations as
select 
  id,
  name,
  email_ical_pilot_started_at,
  now() - email_ical_pilot_started_at as pilot_duration,
  email_ical_pilot_platforms
from organizations
where email_ical_reconciliation_enabled = true
and email_ical_pilot_started_at is not null;

-- Audit table for feature flag changes
create table if not exists feature_flag_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  feature text not null,
  enabled boolean not null,
  reason text,
  changed_by uuid,
  changed_at timestamptz default now()
);

create index if not exists idx_feature_flag_audit_org_feature
  on feature_flag_audit(organization_id, feature);
