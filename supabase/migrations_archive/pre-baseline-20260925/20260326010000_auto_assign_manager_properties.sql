-- Auto-assign all organization properties to newly created managers
-- This trigger ensures managers can see properties immediately without manual SQL

CREATE OR REPLACE FUNCTION assign_properties_to_manager()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new manager is created, assign all properties in their organization
  IF NEW.role = 'manager' THEN
    INSERT INTO user_properties (user_id, property_id)
    SELECT NEW.user_id, p.id
    FROM properties p
    WHERE p.organization_id = NEW.organization_id
    ON CONFLICT (user_id, property_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_manager_created ON user_profiles;

-- Create trigger for new manager assignments
CREATE TRIGGER on_manager_created
AFTER INSERT ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION assign_properties_to_manager();
