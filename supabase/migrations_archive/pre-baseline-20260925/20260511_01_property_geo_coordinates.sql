-- Add geographic coordinates to properties for Google VacationRental schema (geo field)
-- DECIMAL(10,8): latitude covers [-90, 90] with 8 decimal places (~1mm precision)
-- DECIMAL(11,8): longitude covers [-180, 180] with 8 decimal places (~1mm precision)

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
