-- Idioma preferido do hóspede/usuário.
--
-- O código (reserva direta, booking-webhook, e-mails de confirmação, preferências
-- do usuário, export de dados) usa preferred_locale em reservations, guests e
-- user_profiles, mas as migrations 20260404010000 e 20260826045002 nunca foram
-- aplicadas em produção (drift anterior à baseline). Sem as colunas, a reserva
-- direta falha com "Erro ao criar reserva" e o webhook não confirma o pagamento.

alter table public.reservations  add column if not exists preferred_locale varchar(10);
alter table public.guests        add column if not exists preferred_locale varchar(10);
alter table public.user_profiles add column if not exists preferred_locale varchar(10);

create index if not exists idx_reservations_preferred_locale
  on public.reservations (preferred_locale) where preferred_locale is not null;
create index if not exists idx_guests_preferred_locale
  on public.guests (preferred_locale) where preferred_locale is not null;

comment on column public.reservations.preferred_locale is
  'Idioma preferido do hóspede para esta reserva (ex.: pt-PT, en-US, es-ES).';
comment on column public.guests.preferred_locale is
  'Idioma preferido do hóspede, reaproveitado em reservas futuras.';
comment on column public.user_profiles.preferred_locale is
  'Idioma preferido do usuário (pt, pt-BR, en-US, es-ES). NULL = Accept-Language do navegador.';
