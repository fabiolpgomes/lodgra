-- Ensure 'direct' platform exists for direct bookings
-- This platform is required for the public booking API

-- Add unique constraint on name if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platforms_name_key'
  ) THEN
    ALTER TABLE platforms ADD CONSTRAINT platforms_name_key UNIQUE (name);
  END IF;
END $$;

INSERT INTO platforms (name, code, display_name, is_active)
VALUES ('direct', 'direct', 'Reserva Directa', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;
