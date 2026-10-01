-- AHS (Portugal) passa a ver os planos em euros.
-- Sem billing_currency definido, o sistema assume BRL.
update public.organizations
   set billing_currency = 'eur',
       updated_at = now()
 where slug = 'algarve-home-stay'
   and billing_currency is distinct from 'eur';
