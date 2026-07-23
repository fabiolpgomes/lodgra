SELECT                                                                                                                                                                                   
       pl.id as listing_id,
       pl.name as property_name,
       pl.ical_url,
       pl.sync_enabled,
       pl.is_active,
       pl.last_synced_at,
       p.id as property_id,
       p.organization_id
       FROM property_listings pl
       JOIN properties p ON pl.property_id = p.id
       WHERE pl.name ILIKE '%Armação de Pera%'
       ORDER BY pl.name;