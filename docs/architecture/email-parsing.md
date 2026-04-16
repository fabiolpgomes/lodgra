# Arquitectura: Email Parsing Automático de Reservas

**Data:** 2026-03-09
**Autor:** @architect (Aria)
**Status:** Aprovado

---

## Contexto

As plataformas de alojamento (Airbnb, Booking.com, Flatio) enviam emails de confirmação de reserva para o proprietário. O sistema deve ler esses emails automaticamente, extrair os dados relevantes com IA e criar uma reserva em estado Draft para revisão do proprietário.

**Caso de uso principal:**
```
Nova reserva confirmada
Hóspede: João Silva
Check-in: 10 Maio
Check-out: 15 Maio
Valor: €850
```
→ Reserva criada automaticamente no sistema para aprovação.

---

## Restrições e Contexto do Produto

- **Stack actual:** Next.js 15 App Router, Supabase, Resend, Stripe, Vercel
- **Multi-tenant:** `organization_id` em todas as tabelas, RLS activo
- **Volume:** 10–50 emails/dia por organização
- **Fiabilidade:** Best-effort (proprietário valida antes de confirmar)
- **Plataformas suportadas:** Airbnb, Booking.com, Flatio
- **Idiomas:** PT e EN

---

## Decisões Arquitecturais

| Componente | Decisão | Justificação |
|---|---|---|
| Autenticação email | Gmail OAuth2 | Sem password, scopes mínimos, revogável |
| Extracção de dados | Claude Haiku (LLM) | Robusto a mudanças de formato, multi-idioma |
| Trigger | Vercel Cron (5 min) | Best-effort, simples, já usado no projecto |
| Execução | Next.js API Route | Consistente com stack actual |
| Estado da reserva | Draft | Proprietário valida antes de confirmar |
| Armazenamento tokens | Supabase + pgcrypto | Encriptados, isolados por org |

### Alternativas Rejeitadas

| Opção | Motivo da rejeição |
|---|---|
| IMAP genérico | Complexidade desnecessária, menos seguro |
| Gmail Push (Pub/Sub) | Over-engineering para best-effort |
| Regex por plataforma | Frágil a mudanças de formato, manutenção cara |
| Auto-confirmação de reserva | Risco de duplicados e erros |
| IMAP + app password | Pior UX, menos seguro que OAuth2 |

---

## Fluxo Completo

```
1. Proprietário conecta Gmail via OAuth2 (settings)
          ↓
2. Vercel Cron dispara a cada 5 minutos
          ↓
3. Buscar emails não lidos de remetentes conhecidos
   (automated@airbnb.com, noreply@booking.com, noreply@flatio.com)
          ↓
4. Filtrar por assunto (Nova reserva / New booking / etc.)
   + verificar email_parse_log (evitar duplicados por message_id)
          ↓
5. Enviar corpo do email para Claude Haiku
          ↓
6. Claude extrai dados estruturados (JSON)
          ↓
7. Criar reserva com status=draft em Supabase
          ↓
8. Notificar proprietário via Resend
          ↓
9. Proprietário confirma/rejeita na UI
```

---

## Schema de Base de Dados

### `email_connections`
```sql
CREATE TABLE email_connections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email         text NOT NULL,
  access_token  text NOT NULL,  -- encriptado com pgcrypto
  refresh_token text NOT NULL,  -- encriptado com pgcrypto
  token_expiry  timestamptz NOT NULL,
  scope         text NOT NULL DEFAULT 'gmail.readonly',
  connected_at  timestamptz NOT NULL DEFAULT now(),
  last_sync_at  timestamptz,
  UNIQUE(organization_id)       -- uma ligação Gmail por org
);

-- RLS: apenas a própria org acede
ALTER TABLE email_connections ENABLE ROW LEVEL SECURITY;
```

### `email_parse_log`
```sql
CREATE TABLE email_parse_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  message_id      text NOT NULL,           -- Gmail message ID (deduplicação)
  received_at     timestamptz NOT NULL,
  platform        text,                    -- airbnb | booking | flatio | unknown
  status          text NOT NULL,           -- parsed | skipped | error
  parsed_data     jsonb,                   -- output do Claude
  reservation_id  uuid REFERENCES reservations(id),
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, organization_id)
);

-- RLS: apenas a própria org acede
ALTER TABLE email_parse_log ENABLE ROW LEVEL SECURITY;
```

---

## API Routes

### `GET /api/email/connect`
Inicia o fluxo OAuth2 com Google. Redireciona para Google Consent Screen.

**Scopes solicitados:** `gmail.readonly`

### `GET /api/email/callback`
Callback OAuth2. Recebe `code`, troca por `access_token` + `refresh_token`, guarda encriptado em `email_connections`.

### `DELETE /api/email/disconnect`
Revoga o token OAuth2 no Google e elimina o registo em `email_connections`.

### `POST /api/cron/email-parser`
Protegido por `Authorization: Bearer {CRON_SECRET}`.

Fluxo:
1. Buscar todas as orgs com `email_connections` activas
2. Para cada org: autenticar Gmail API, buscar emails não lidos
3. Filtrar remetentes e assuntos conhecidos
4. Deduplicar via `email_parse_log.message_id`
5. Chamar Claude Haiku para extracção
6. Criar reserva draft + notificar via Resend

---

## Prompt Claude Haiku

```
Extrai do seguinte email de confirmação de reserva os dados em JSON.
Se um campo não existir no email, retorna null para esse campo.

Campos a extrair:
{
  "guest_name": string | null,
  "checkin_date": "YYYY-MM-DD" | null,
  "checkout_date": "YYYY-MM-DD" | null,
  "amount": number | null,
  "currency": "EUR" | "BRL" | string | null,
  "platform": "airbnb" | "booking" | "flatio" | "unknown",
  "property_name": string | null,
  "confirmation_code": string | null,
  "num_guests": number | null
}

Email:
{email_body}
```

**Modelo:** `claude-haiku-4-5-20251001`
**Custo estimado:** ~$0.001/email × 50/dia × 30 dias = ~$1.50/mês por organização

---

## Componente UI (Settings)

Localização sugerida: `/settings` → secção "Integrações"

```
┌─────────────────────────────────────────┐
│ 📧 Ligação Gmail                        │
│                                         │
│ Estado: ● Conectado (joao@gmail.com)    │
│ Última sincronização: há 3 minutos      │
│                                         │
│ [Desconectar]                           │
└─────────────────────────────────────────┘

-- ou --

┌─────────────────────────────────────────┐
│ 📧 Ligação Gmail                        │
│                                         │
│ Estado: ○ Não conectado                 │
│                                         │
│ [Conectar Gmail]                        │
└─────────────────────────────────────────┘
```

---

## Segurança

- **OAuth2 scopes mínimos:** `gmail.readonly` (leitura apenas)
- **Tokens encriptados:** `pgcrypto` (AES-256) em Supabase
- **Revogação:** utilizador pode desconectar a qualquer momento (revoga no Google + apaga BD)
- **RLS:** `email_connections` e `email_parse_log` isolados por `organization_id`
- **Cron protegido:** `CRON_SECRET` já existente no projecto
- **Sem armazenamento de emails:** apenas os dados extraídos são guardados (RGPD)

---

## Variáveis de Ambiente Necessárias

```bash
GOOGLE_CLIENT_ID        # Google Cloud Console OAuth2
GOOGLE_CLIENT_SECRET    # Google Cloud Console OAuth2
EMAIL_PARSE_ENCRYPT_KEY # Chave AES para encriptar tokens (32 bytes)
```

---

## Ficheiros a Criar/Modificar

| Ficheiro | Acção |
|---|---|
| `src/app/api/email/connect/route.ts` | Criar — OAuth2 redirect |
| `src/app/api/email/callback/route.ts` | Criar — OAuth2 callback |
| `src/app/api/email/disconnect/route.ts` | Criar — revogar acesso |
| `src/app/api/cron/email-parser/route.ts` | Criar — parsing cron |
| `src/lib/email/gmail-client.ts` | Criar — Gmail API wrapper |
| `src/lib/email/parser.ts` | Criar — extracção via Claude |
| `src/lib/email/platforms.ts` | Criar — filtros por plataforma |
| `src/components/settings/EmailConnection.tsx` | Criar — UI OAuth2 |
| `supabase/migrations/XXXXXX_email_parsing.sql` | Criar — tabelas |
| `src/app/settings/page.tsx` | Modificar — adicionar secção |
| `vercel.json` | Modificar — adicionar cron `/api/cron/email-parser` |

---

## Dependências Externas

| Pacote | Uso |
|---|---|
| `googleapis` | Gmail API client (OAuth2 + leitura de emails) |
| `@anthropic-ai/sdk` | Claude Haiku para extracção (já pode existir) |

---

## Fora de Âmbito (esta versão)

- Suporte IMAP genérico
- Outlook / Apple Mail
- Gmail Push (Pub/Sub) — polling é suficiente
- Auto-confirmação de reservas
- Parsing de emails de cancelamento ou modificação
- Multi-conta Gmail por organização
