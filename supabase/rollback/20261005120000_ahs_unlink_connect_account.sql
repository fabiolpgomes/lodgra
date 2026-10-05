-- Reverte: volta a ligar a AHS à conta conectada acct_1ULidn2cNFP5D6vz (Lodgra PT).
update public.organizations
   set stripe_connect_account_id = 'acct_1ULidn2cNFP5D6vz',
       stripe_connect_platform = 'eur',
       stripe_connect_status = 'active',
       stripe_connect_updated_at = now(),
       updated_at = now()
 where slug = 'algarve-home-stay'
   and stripe_connect_account_id is null;
