-- Migration: Add property limit validation trigger
-- Purpose: Enforce maxProperties limits at database level (RLS)
-- Date: 2026-05-23

-- Create function to check property limits before insert
CREATE OR REPLACE FUNCTION check_property_limit()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  property_count INT;
  plan_name TEXT;
  max_allowed INT;
BEGIN
  org_id := NEW.organization_id;

  -- Count current non-deleted properties for this org
  SELECT COUNT(*) INTO property_count
  FROM properties
  WHERE organization_id = org_id AND deleted_at IS NULL;

  -- Get the latest subscription plan for this org
  SELECT plan INTO plan_name
  FROM subscriptions
  WHERE organization_id = org_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Map plan to max allowed properties (from PLAN_LIMITS in plans.ts)
  max_allowed := CASE plan_name
    WHEN 'essencial' THEN 10    -- 1 included + 9 extras max
    WHEN 'expansao' THEN 10     -- 3 included + 7 extras max
    WHEN 'premium' THEN NULL    -- unlimited
    WHEN 'enterprise' THEN NULL -- unlimited
    ELSE 10                     -- default to Expansão limit
  END;

  -- Check limit (NULL = unlimited, so only check if max_allowed is not NULL)
  IF max_allowed IS NOT NULL AND property_count >= max_allowed THEN
    RAISE EXCEPTION 'Property limit reached for plan %. Current: %, Limit: %',
      COALESCE(plan_name, 'unknown'), property_count, max_allowed
      USING HINT = 'Upgrade your plan or remove a property to add a new one';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS check_property_limit_trigger ON properties;

-- Create trigger on properties table before INSERT
CREATE TRIGGER check_property_limit_trigger
  BEFORE INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION check_property_limit();

-- Add comment for documentation
COMMENT ON FUNCTION check_property_limit() IS 'Validates that property count does not exceed plan limits (Essencial=10, Expansão=10, Premium=unlimited)';
COMMENT ON TRIGGER check_property_limit_trigger ON properties IS 'Enforces property limit based on subscription plan';
