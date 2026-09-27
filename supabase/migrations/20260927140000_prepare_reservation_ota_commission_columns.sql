-- reservations.commission_* guardam a COMISSÃO COBRADA PELA PLATAFORMA (Airbnb, Booking...).
-- Esse dado só existirá com integração oficial por API (iCal não traz comissão); até lá fica NULL.
-- Antes: commission_rate tinha default 0.15 e commission_calculated_at era gravado na criação,
-- o que fazia toda reserva parecer ter 15% de comissão "calculada". Isso é corrigido aqui.
-- (A comissão de GESTÃO da empresa é outra coisa: properties.management_percentage.)

alter table public.reservations alter column commission_rate drop default;

update public.reservations
   set commission_rate = null,
       commission_calculated_at = null
 where commission_amount is null;

comment on column public.reservations.commission_amount is
  'Comissão cobrada pela plataforma de origem (OTA) nesta reserva, na moeda da reserva. Preenchida só por integração oficial via API; NULL = desconhecida (ex.: iCal). Não é a comissão de gestão (ver properties.management_percentage).';
comment on column public.reservations.commission_rate is
  'Taxa de comissão da OTA aplicada nesta reserva (0–1), informada pela integração oficial. NULL = desconhecida.';
comment on column public.reservations.commission_calculated_at is
  'Momento em que commission_amount/commission_rate foram recebidos da integração oficial. NULL enquanto não houver dado.';
