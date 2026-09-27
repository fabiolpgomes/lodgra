# Inventário: funcionalidades com tabelas/buckets inexistentes — 27/09/2026

Contexto: 33 tabelas e 1 bucket referenciados pelo código não existem em produção nem em staging
(ver RELATORIO.md §2). O supabase-js devolve erro em vez de lançar exceção, então a maioria das
telas "funciona" mostrando vazio/zero e as gravações falham em silêncio.

## Grupo A — Criar agora (impacto real em produção, esforço baixo)

| Funcionalidade | Tabelas/bucket | Onde quebra hoje | Risco |
|---|---|---|---|
| Webhooks Stripe (billing + booking) | `stripe_events`, `payments` | `api/stripe/webhooks/{billing,booking}`, `lib/stripe/webhooks/*` | Idempotência perdida (evento reprocessado em retry); pagamentos não registrados |
| Descadastro de e-mail | `email_unsubscribes` | `app/unsubscribe`, `api/cron/cleanup` | Link de unsubscribe dos e-mails de confirmação não funciona (RGPD) |
| Log de e-mails enviados | `email_sent` | `lib/email/send-booking-confirmation`, `api/cron/cleanup` | Sem rastro de envio/falha (e-mail em si é enviado com template padrão) |
| Dashboard de comissões | `commission_summary` (view materializada) | `dashboard/reports` → `CommissionDashboard` | Mostra zero em comissões do mês/ano |
| Documentos de despesas | bucket `expense-documents` | `ExpenseDocuments` → `api/expenses/[id]/documents` | Upload de comprovantes falha |

## Grupo B — Decisão de produto (tem UI ou está no roadmap)

| Funcionalidade | Tabelas | UI / entrada | Observação |
|---|---|---|---|
| WhatsApp (logs, templates, config, analytics) | `whatsapp_logs`, `whatsapp_message_templates`, `whatsapp_config`, `whatsapp_analytics` | `settings/whatsapp-templates`, `WhatsAppAnalyticsDashboard`; crons `checkin-codes`/`checkout-reminders` (não agendados) | WABA da AHS configurada; inbox unificada no roadmap |
| Templates de e-mail por organização | `organization_email_templates` | `settings/organizations/[orgId]/email-templates` | Hoje sempre usa o template padrão |
| Template da página de reservas | `organization_templates` | `api/organizations/[orgId]/template` ← `BookingPageClient` (página pública `/booking`) | Hoje a página pública sempre cai no template padrão |
| Portal/fotos de limpeza | (bucket `cleaning-photos` existe; código usa `cleaning-task-photos`) | `cleaner/tasks/[id]`, `CleaningPhotoGallery` | Bucket, colunas (`file_path`×`storage_path`) e papel `manager` errados; `lib/supabase/cleaning.queries.ts` é código morto |
| Correções de extração (parser de e-mail) | `extraction_corrections` | `api/email-reconciliation/corrections/stats` | Parser de e-mail está ativo em produção (cron 15 min) |
| Canal Booking.com (API) | `channel_listings` | `settings/channels`, `api/channels/booking/*`, cron `sync-booking-reservations` | Integração por API foi abandonada (sync é por iCal); banco tem `channel_connections`/`channel_listing_mappings` |

## Grupo C — Remover código (sem UI, ou dashboards de features nunca lançadas)

| Funcionalidade | Tabelas | Código |
|---|---|---|
| Recomendações de preço | `pricing_recommendations`, `price_history` | `api/properties/[id]/recommendations/*` (sem UI) |
| Histórico/analytics de preço | `price_history`, `price_analytics` | `api/properties/[id]/price-history/*`, `PriceAnalyticsDashboard` |
| Forecasting de receita | `revenue_forecasts`, `forecast_cache` | `api/properties/[id]/analytics/forecasting` (sem UI) |
| Monitor de concorrentes | `competitors`, `competitor_*` (3) | `api/properties/[id]/competitors` (sem UI) |
| Google performance / validação | `google_performance_*` (2), `google_validation_logs` | `admin/google-performance`, `admin/google-troubleshooting`, `lib/google/performance-sync` |
| Tráfego por organização | `organization_traffic_events` | `OrganizationTrafficTracker` (em `/booking` e `/p/[slug]`), `api/analytics/traffic` |
| Status de webhooks (admin) | `webhook_events` | `api/admin/webhook-status`, `lib/webhooks/webhook-manager` (sem UI) |

## Grupo D — Nada a fazer (só existiam nas migrations arquivadas)
`invoices`, `seasonal_pricing_rules`, `forecast_assumptions`, `reservation_corrections`,
`analytics_test_events`, `monthly_property_metrics`.

## Decisões (27/09/2026)
- Grupo A: criar. Grupo B: consertar todos (WhatsApp, templates de e-mail, módulo de limpeza, correções do parser, template da página de reservas).
- Grupo C e canal Booking.com por API: **removidos** (commit "refactor: remove funcionalidades mortas"). Junto saíram os receptores
  de webhook de OTAs (Airbnb/VRBO/Booking/Flatio), o cron `sync-booking`, os dashboards admin de distribuição/otimização
  (usavam `@clerk/nextjs`, dependência também removida) e a documentação da Booking API (movida para `docs/archive/`).
- Dashboard de comissões (grupo A): **removido** em vez de criado. Lia `reservations.commission_amount`, nunca
  preenchido (0/118 em produção), com taxa fixa de 10% no código. Regra de negócio: a comissão da gestora é o
  "Percentual Gestão do Imóvel" de cada propriedade. A view `commission_summary` criada em `20260927110000` é
  removida em `20260927130000`. Relatório de comissões baseado no percentual da propriedade fica no backlog.
