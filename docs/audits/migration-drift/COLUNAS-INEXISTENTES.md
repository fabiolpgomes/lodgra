# Código × schema: colunas referenciadas que não existem em produção

Levantamento de 2026-09-28 (varredura estática de `.from('<tabela>').select/insert/update('<colunas>')`
contra `supabase/migrations/20260925000000_baseline_producao.sql`). Itens com nome de relação
(`properties`, `guests`, `platforms`, `owners`…) são embeds do PostgREST e **não** são erro.

## Corrigido
- `properties.min_nights` — removida em 2026-07-31; checkout direto, disponibilidade e feed Google
  passaram a usar `property_availability.min_nights` (commit 7610475b).
- `reservations/guests/user_profiles.preferred_locale` — migration 20260928100000.

## Pendente (confirmar uso e decidir: criar coluna ou corrigir código)
| Tabela.coluna | Onde |
|---|---|
| organizations.currency, organizations.timezone | dashboard, ia-native (caem no fallback) |
| organizations.stripe_pt_connect_id / _onboarded | api/stripe/connect/*, api/stripe/payment-intent |
| organizations.stripe_br_customer_id | api/billing/*, auth/callback |
| organizations.stripe_subscription_item_id, billing_unit_count | lib/billing/stripe-usage |
| organizations.asaas_api_key / asaas_environment | settings, api/payments/asaas/pix |
| organizations.contact_phone, manager_phone, email, logo_url, metadata, cleaner_portal_enabled, whatsapp_automation_enabled | notificações, limpeza, WhatsApp |
| reservations.check_in_date / check_out_date / checkout_reminder_sent_at | api/cron/checkin-codes, checkout-reminders |
| reservations.confirmation_code | api/email/send-confirmation |
| reservations.beds24_booking_id | admin/sync-*, calendar |
| guests.average_rating / loyalty_score / reservation_count | loyalty |
| properties.airbnb_id / booking_id / google_gmb_id / cancellation_policy_id / image_url / price_per_night / rating / review_count | reviews/sync, admin, templates |
| property_listings.name / platform / external_id | admin/fix-listings*, trigger-ical-sync, cron/email-parser, ical/syncWebhook |
| property_prices.min_nightly_price / max_nightly_price | pricing-constraints |
| cleaning_checklist_* (is_checked, item, is_default, is_global, updated_at) | módulo de limpeza |
| sync_logs.created_at, user_profiles.user_id | admin/sync-status, organization/members |

Parte destes está em funcionalidades já removidas/órfãs (entra na limpeza de arquivos órfãos);
os de pagamento/billing e cron têm prioridade.
