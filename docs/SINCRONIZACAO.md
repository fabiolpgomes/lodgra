# Sincronização — fonte de verdade (out/2026)

Lodgra não tem API do Booking nem da Airbnb. A reserva chega por dois caminhos e é ligada automaticamente:

1. **iCal** (`/api/cron/sync-ical`, pg_cron job 2, a cada 15 min) — datas e bloqueios por anúncio. Booking envia blocos opacos (`CLOSED - Not available`).
2. **Gmail** (`/api/cron/email-parser`, job 1) — ingere e-mails das plataformas em `raw_emails` (chave `${mailbox}:${gmailId}`). Mensagens que não são reserva ficam `rejected` com o corpo descartado.
3. **Processamento** (`/api/email-extraction/process-pending`, job 3 `enrich-reservations-15min`) — classificador (`message-kind.ts`) → extração LLM → `resolveStayYear` → `email_extractions` → `syncExtractedDataToReservation`.
4. **Ligação** — matching (código 50, datas 30, plataforma 10, imóvel 10, identidade opaca 40; auto ≥ 80) e RPC `reconcile_email_extraction`. Booking parcial (sem check-out/nome): liga pelo nº da reserva ou ancora no bloco opaco único que começa no check-in; hóspede fica `Hóspede` até o anfitrião completar.
5. **Alertas** (`/api/cron/sync-alerts`, job 4 `sync-alerts-15min`, minutos 5/20/35/50).

## Painel `/[locale]/sync`
`src/lib/sync-health/actions.ts` (puro) decide estado e ações; `load.ts` lê o banco; `GET /api/sync/actions` serve painel, sino e e-mail.

- Estado: verde "Tudo em dia" · âmbar "N ações pendentes" · vermelho "Sincronização parada" (Gmail desligado/parado > 2 h, fila parada > 45 min).
- Ações (cada uma com plataforma, código, imóvel, datas e link direto): Gmail · fila · calendário a falhar (âmbar, abre `/properties/{id}`) · completar hóspede (drawer, `PATCH /api/reservations/[id]/guest`) · reserva no iCal sem e-mail > 24 h · reserva alterada na plataforma · mensagem que pede ação.
- "Ignorar" com motivo → `sync_action_states.dismissed_at` (`POST /api/sync/actions/dismiss`).
- "Sincronizar agora" → `POST /api/sync/full`: iCal do tenant + Gmail + até 4 lotes de processamento.
- Indicador de confiança: % de reservas de plataforma dos últimos 30 dias com nome e valor.

## Avisos ativos
- **Sino** (`SyncBell` no `TopBar`): contagem e as 5 primeiras ações; atualiza a cada 5 min e ao voltar à janela. Só desktop.
- **E-mail** (`alerts.ts` puro + `alerts-run.ts`): para o contacto da empresa + admins do tenant. Um aviso quando surge, depois um lembrete por dia. Só ações com `alert: true`: Gmail, fila, completar hóspede, calendário com ≥ 3 falhas seguidas. Resolvidas: estado apagado (recaída avisa de novo). Ignoradas: nunca.
- Respostas do cron: `sent` · `nothing_due` · `no_recipients` · `email_unavailable` (falta `RESEND_API_KEY`) · `failed`.
- **Selo no imóvel** (`PropertySyncBadge`): verde/âmbar/vermelho só com as ações desse imóvel; admin e gestor.

## Verificação rápida (SQL)
```sql
select jobid, jobname, schedule, active from cron.job order by jobid;
select status, return_message, start_time from cron.job_run_details where jobid = 4 order by start_time desc limit 3;
select status_code, left(content::text, 300), created from net._http_response where content::text like '%"tenants"%' order by created desc limit 1;
select left(error_message, 300), synced_at from sync_logs where property_listing_id = '<listing>' order by synced_at desc limit 3;
```
`net._http_response` guarda ~6 h. `succeeded` no cron só prova que o pedido saiu; confirmar o HTTP 200.

## Armadilhas conhecidas
- Gmail OAuth em "Testing" expira o refresh token em 7 dias — a app tem de estar em Production.
- iCal Booking HTTP 400 = link de exportação renovado na plataforma: copiar o novo e colar no anúncio.
- Estadia já iniciada que sai do iCal Booking não é cancelamento (`assertReconciledFeedConsistency` ignora `check_in <= hoje`).
- Datas `YYYY-MM-DD` mostradas com `toLocalDate` (`src/lib/dates/date-only.ts`); `new Date('YYYY-MM-DD')` mostra o dia anterior no Brasil. Ainda há ~50 cálculos antigos no dashboard/relatórios/calendário.
- E-mails de reservas com mais de 90 dias não são lidos pelo Gmail ingest: completar à mão ou "Ignorar".
