# Lodgra — Reconciliação Automática E-mail ↔ iCal

**Status:** Fonte normativa interna aprovada  
**Origem:** documento fornecido pelo stakeholder em 2026-07-19  
**Escopo:** Epic 38 / Story 38.1

## Problema e objetivo

O iCal traz bloqueios de datas, mas as OTAs normalmente omitem nome do hóspede, valor e número de hóspedes. Esses dados existem no e-mail de confirmação. O Lodgra deve capturar o e-mail, extrair os dados via LLM e reconciliá-los com o evento iCal sem duplicar reservas e sem exigir digitação manual.

A ordem de chegada não é garantida. O motor precisa funcionar nos dois sentidos: evento iCal novo procura e-mail órfão; e-mail novo procura evento iCal compatível.

## Modelo conceitual

- `calendar_events`: evento iCal com imóvel, tenant, plataforma, datas, UID, resumo bruto, reserva vinculada e estado `unmatched | matched | ignored`.
- `raw_emails`: staging obrigatório que recebe o corpo bruto antes de qualquer parsing.
- `email_extractions`: extração estruturada com plataforma, confiança, hóspede, datas, valor, moeda, código, identificador bruto do imóvel, snippet, evento vinculado e estado `pending | auto_matched | needs_review | no_match`.
- `reservations`: reserva final consolidada com imóvel, evento, extração, hóspede, datas, valor, moeda, plataforma e confirmação do anfitrião.
- `extraction_corrections`: correções manuais por campo e plataforma.

No schema Lodgra, o tenant conceitual é materializado como `organization_id`, conforme ADR 0381. Os nomes físicos brownfield de `reservations` são preservados pelo Data Design 0381.

## Algoritmo de matching

### Filtro de candidatos

- mesma organização;
- contraparte em `unmatched` ou `pending`;
- sobreposição de datas com tolerância de ±1 dia.

### Score 0–100

| Critério | Peso | Avaliação |
|---|---:|---|
| `reservation_code` presente no resumo bruto do iCal | 50 | substring exata, case-insensitive |
| check-in e check-out exatamente iguais | 30 | comparação direta |
| datas dentro de ±1 dia, mas não exatas | 15 | substitui os 30 pontos |
| mesma plataforma | 10 | comparação de strings |
| identificador do imóvel compatível | 10 | similaridade fuzzy ≥ 0,6 |

### Decisão

- score ≥ 80: auto-match, consolida reserva, marca evento e extração e envia confirmação passiva;
- score 40–79: `needs_review`, com até três candidatos ordenados;
- score < 40: `no_match`; depois de 48 horas, oferecer criação manual pré-preenchida;
- empate com ambiguidade real: nunca auto-match; encaminhar para revisão;
- idempotência: nunca duplicar por evento ou extração já vinculados.

## Fases obrigatórias e gates

### Fase 0 — Schema

Criar/ajustar as tabelas, índices por organização e datas e suporte a similaridade. Gate: migration sem erro em staging, matriz RLS/constraints aprovada e `EXPLAIN (ANALYZE, BUFFERS)` comprovando os índices conforme o Data Design 0381.

### Fase 1 — Ingestão

Configurar `reservas+{organization_id}@lodgra.io`, receber por webhook, identificar organização pelo destinatário, persistir corpo bruto antes de parsing e filtrar remetentes conhecidos antes do LLM. Gate: e-mail real de teste gera `raw_emails` na organização correta.

### Fase 2 — Extração LLM

Consumir e-mails pendentes, extrair conforme plataforma, validar JSON, tratar inválidos explicitamente e persistir confiança. Gate: em 10–15 e-mails reais históricos Airbnb + Booking, obter pelo menos 90% de acerto nos campos obrigatórios `guest_name`, `check_in` e `check_out`.

### Fase 3 — Validação determinística pós-LLM

- rejeitar `check_out <= check_in`;
- quando houver histórico, comparar valor com ADR médio × noites e forçar revisão se o desvio superar 3× para cima ou para baixo;
- nome vazio ou genérico não bloqueia, mas fica incompleto.

Gate: testes unitários das três regras aprovados. **Este gate é obrigatório e bloqueia integralmente a Fase 4, independentemente do resultado de testes manuais da Fase 2.**

### Fase 4 — Reconciliação

Implementar funções puras nos dois sentidos, separar score de decisão, disparar nas duas entradas e garantir idempotência. Gate: testes de código exato, somente datas, ambiguidade, nenhum candidato e repetição sem duplicidade.

### Fase 5 — Confirmação

Lista de revisão com candidatos, notificação passiva de auto-match e criação manual pré-preenchida após 48 horas. Gate: fluxo ponta a ponta confirmado com um clique e reserva correta persistida.

### Fase 6 — Correções

Registrar cada correção e apresentar taxa por campo/plataforma. Gate: correção na UI gera registro automaticamente.

### Fase 7 — Rollout

Feature flag por organização, piloto Airbnb + Booking e monitoramento por duas semanas. Gate: auto-match ≥ 70%, zero reservas duplicadas e zero associações ao imóvel errado antes de expandir.

## Regra de execução

As fases devem ser executadas estritamente em ordem. Nenhuma fase pode começar antes da evidência e aprovação do gate anterior. A Fase 3 não é opcional.

## Artefatos derivados

- `docs/prd/prd-email-ical-reconciliation.md`
- `docs/stories/epic-38-email-ical-reconciliation.md`
- `docs/stories/38.1.email-ical-reconciliation.md`
- `docs/architecture/adr-0381-email-ical-phase-0.md`
- `docs/architecture/data-0381-email-ical-phase-0.md`

