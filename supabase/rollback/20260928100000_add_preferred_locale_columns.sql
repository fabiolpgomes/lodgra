-- Rollback de 20260928100000_add_preferred_locale_columns.sql
-- Atenção: o código da reserva direta e do booking-webhook depende destas colunas.
drop index if exists public.idx_reservations_preferred_locale;
drop index if exists public.idx_guests_preferred_locale;
alter table public.reservations  drop column if exists preferred_locale;
alter table public.guests        drop column if exists preferred_locale;
alter table public.user_profiles drop column if exists preferred_locale;
