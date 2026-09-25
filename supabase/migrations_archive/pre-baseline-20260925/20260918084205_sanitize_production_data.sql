-- Sanitization function for production data in staging
  CREATE OR REPLACE FUNCTION sanitize_production_data()
  RETURNS void AS $$
  BEGIN
    UPDATE users SET
      email = 'user_' || id || '@example.com',
      phone = '+55 98888-8888',
      password_hash = NULL;

    UPDATE reservations SET
      guest_name = 'GUEST_' || id,
      guest_email = 'guest_' || id || '@example.com',
      guest_phone = '+55 98888-8888';

    RAISE NOTICE 'Sanitization complete';
  END;
  $$ LANGUAGE plpgsql;
