-- Rollback: AHS volta a não ter moeda definida (assume BRL).
update public.organizations
   set billing_currency = null,
       updated_at = now()
 where slug = 'algarve-home-stay';
