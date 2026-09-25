-- Calendar settings: custom fees configured per property.
CREATE TABLE IF NOT EXISTS property_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_fees_property_id ON property_fees(property_id);

ALTER TABLE property_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_fees_select_organization" ON property_fees
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "property_fees_insert_organization" ON property_fees
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "property_fees_update_organization" ON property_fees
  FOR UPDATE USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "property_fees_delete_organization" ON property_fees
  FOR DELETE USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );
