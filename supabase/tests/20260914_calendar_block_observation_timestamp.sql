BEGIN;
DO $$ DECLARE
  org uuid; property uuid; listing uuid; block public.calendar_blocks.id%TYPE;
  observed timestamptz; version timestamptz;
BEGIN
  BEGIN
    SELECT organization_id,property_id,id INTO org,property,listing FROM public.property_listings
      WHERE organization_id IS NOT NULL ORDER BY created_at,id LIMIT 1;
    INSERT INTO public.calendar_blocks(organization_id,property_id,property_listing_id,start_date,end_date,block_type,external_uid)
    VALUES(org,property,listing,DATE '2099-08-01',DATE '2099-08-02','platform_sync','clock-fixture-'||gen_random_uuid())
    RETURNING id INTO block;
    observed:=clock_timestamp();
    UPDATE public.calendar_blocks SET updated_at=now(),notes='old transaction timestamp' WHERE id=block
      RETURNING updated_at INTO version;
    IF version<observed THEN RAISE EXCEPTION 'block timestamp regressed to transaction start'; END IF;
    UPDATE public.calendar_blocks SET updated_at=now() WHERE id=block;
    IF NOT EXISTS(SELECT 1 FROM public.calendar_blocks WHERE id=block AND updated_at>version) THEN
      RAISE EXCEPTION 'second block update reused an observation version';
    END IF;
    DELETE FROM public.calendar_blocks WHERE id=block AND updated_at=version;
    IF NOT EXISTS(SELECT 1 FROM public.calendar_blocks WHERE id=block) THEN
      RAISE EXCEPTION 'stale cleanup version deleted a refreshed block';
    END IF;
    RAISE EXCEPTION USING ERRCODE='P4102',MESSAGE='rollback block timestamp fixture';
  EXCEPTION WHEN SQLSTATE 'P4102' THEN
    IF SQLERRM<>'rollback block timestamp fixture' THEN RAISE; END IF;
  END;
  IF EXISTS(SELECT 1 FROM public.calendar_blocks WHERE id=block) THEN RAISE EXCEPTION 'block fixture leaked'; END IF;
END $$;
ROLLBACK;
