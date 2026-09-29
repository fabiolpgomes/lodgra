# Pagamentos das reservas diretas por tenant — plano Stripe Connect

> Objetivo: cada tenant (gestor/proprietário) recebe o dinheiro das reservas diretas na
> **sua própria conta Stripe**, criada e verificada **dentro do Lodgra**, sem chaves de API
> nem `.env`. Substitui o modelo atual em que a AHS usa `STRIPE_PT_SECRET_KEY`.

## Integração Connect recomendada

### A. Configuração da conta conectada
- API: **Accounts v2** (`/v2/core/accounts`) — sem o `type` legado (standard/express/custom)
- Painel: **Full Stripe Dashboard** (`dashboard: "full"`) — o tenant entra em dashboard.stripe.com
- Cobrança de taxas: **o Stripe cobra o tenant** (`defaults.responsibilities.fees_collector: "stripe"`)
- Responsabilidade por saldo negativo: **Stripe** (`defaults.responsibilities.losses_collector: "stripe"`)
- Configuração: **`merchant`** com a capacidade `card_payments` (o tenant aceita pagamentos
  diretamente). `stripe_balance.payouts` é pedido automaticamente — não pedir explicitamente.

Porquê: o tenant é um negócio independente que vende as próprias estadias; é ele quem
responde por reembolsos e disputas. O Lodgra não precisa de assumir taxas nem riscos.

### B. Padrão de cobrança: cobranças diretas
O Checkout da reserva é criado **na conta do tenant** (header `Stripe-Account`). O tenant é o
vendedor oficial (merchant of record): o nome dele aparece na fatura do cartão do hóspede,
e o dinheiro entra no saldo dele e segue para o banco dele.

### C. Cadastro do tenant (onboarding)
Método: **componentes embutidos** (`account_onboarding`), dentro do Lodgra.
1. Definições → **Pagamentos online** → "Configurar recebimentos".
2. O Lodgra cria a conta v2 na plataforma do país do tenant (BR → Lodgra BR; PT/UE → Lodgra PT),
   grava `stripe_account_id` na organização e abre o componente de cadastro.
3. O tenant preenche dados, documento e conta bancária/IBAN; o Stripe verifica.
4. O Lodgra lê o estado da conta (webhook + consulta) e só liga o pagamento online na página
   de reservas quando `configuration.merchant.capabilities.card_payments.status === 'active'`.
5. Pedidos novos de documentos aparecem no `notification_banner` dentro do Lodgra.

### D. Acesso do tenant ao painel
Conta com painel completo: o tenant entra diretamente em dashboard.stripe.com para ver
pagamentos, repasses e reembolsos. No Lodgra, os componentes embutidos mostram o essencial.

### E. Componentes embutidos
- `account_onboarding` — cadastro
- `notification_banner` — **obrigatório**; avisa quando o Stripe pede algo novo, para a conta não ser desativada
- `account_management` — dados e conta bancária
- `payments` — pagamentos e disputas (visão completa, por serem cobranças diretas)
- `payouts` — repasses para o banco

### F. Webhooks
Usar webhooks (endpoint **de contas conectadas** em cada plataforma) para confirmar pagamentos
e acompanhar o estado das contas, sempre verificando a assinatura.

### G. Liberação conforme o estado do cadastro
Consultar `stripe.v2.core.accounts.retrieve(id)`:
- `configuration.merchant.capabilities.card_payments.status === 'active'` → aceita reservas pagas
- `configuration.merchant.capabilities.stripe_balance.payouts.status` → repasses ao banco
Não usar os booleanos v1 `charges_enabled`/`payouts_enabled`.

### H. Taxas
- Comissão do Lodgra: **nenhuma por agora** (`application_fee_amount` não enviado).
- O tenant paga as taxas de processamento do Stripe diretamente; o Lodgra não absorve nada.
- No futuro: comissão por reserva com `application_fee_amount` = comissão do Lodgra
  (modo `platform_fee_only`: as taxas do Stripe já são pagas pelo tenant).
- Tarifas por país e meio de pagamento: https://stripe.com/pricing

```
 Hóspede paga 500 €
        │  (cobrança direta na conta do tenant)
        ▼
 ┌────────────────────┐
 │  Conta do tenant   │ ── recebe 500 € − taxas Stripe (− comissão Lodgra, se um dia houver)
 └─────────┬──────────┘
           │ repasse automático
           ▼
     Banco do tenant
```

### I. Modelo de receita do Lodgra
- Assinatura mensal (Essencial/Expansão/Premium/Enterprise) — **continua separada**, nas contas
  de plataforma BRL/EUR, como já implementado. Não usar `customer_account` agora: a assinatura
  é paga pela organização via Checkout, independente da conta conectada.
- Comissão por reserva: opcional, depois (ver H).

### J. Plano de implementação (Lodgra)
1. **Banco** — migration: `organizations.stripe_connect_account_id`, `stripe_connect_platform`
   (`br`|`eu`), `stripe_connect_status` (`none|pending|active|restricted`),
   `stripe_connect_updated_at`. RLS: só admin da org lê; escrita só service role.
2. **Servidor**
   - `lib/stripe/connect.ts`: criar conta v2 (país da org → plataforma BR ou PT), criar
     Account Session para os componentes, ler estado das capacidades.
   - `POST /api/stripe/connect/account` (admin): cria a conta se não existir.
   - `POST /api/stripe/connect/session` (admin): devolve `client_secret` da Account Session.
   - Webhook `POST /api/stripe/booking-webhook` (endpoint "contas conectadas" em cada
     plataforma): confirma/expira reservas (`checkout.session.completed/expired`) com a mesma
     idempotência (`stripe_webhook_events`) e só aceita o evento da conta onde a reserva foi
     cobrada. O estado da conta é lido do Stripe ao abrir "Pagamentos online", ao sair do
     cadastro e antes de cada reserva (não depende de eventos de conta).
3. **Reserva direta** — `api/public/bookings`: criar o Checkout **com `stripeAccount`** da org
   dona da propriedade; se a org não tiver conta ativa → não oferece pagamento online.
   Reembolso/cancelamento (`billing/refunds`, `cancelReservation`) também com `stripeAccount`.
4. **Tela** — Definições → Pagamentos online: estado, botão de cadastro, componentes
   `account_onboarding`, `notification_banner`, `account_management`, `payments`, `payouts`
   (`@stripe/connect-js` + `@stripe/react-connect-js`).
5. **Migração da AHS** — a AHS faz o cadastro como qualquer tenant (nova conta conectada à
   Lodgra PT). Depois de ativa e testada, retirar `STRIPE_PT_SECRET_KEY`, `client-pt.ts` e o
   webhook de reservas antigo. O histórico antigo fica na conta atual da AHS.
6. **Go-live** — ativar Connect em cada plataforma (Configurações → Connect), perfil da
   plataforma, branding, testes em sandbox (cadastro, reserva, reembolso, disputa) e só depois live.

### K. Risco e responsabilidade
- **Responsabilidade por saldo negativo:** Stripe (o tenant responde pelas próprias disputas).
- **Gestão de risco/fraude:** Stripe Radar na conta de cada tenant.

### L. Porque encaixa no Lodgra
- O hóspede reserva a casa do tenant; o tenant é o vendedor — cobranças diretas refletem isso.
- Tenants sem conhecimento técnico: cadastro guiado pelo Stripe, dentro do Lodgra.
- O Lodgra não toca no dinheiro das reservas nem assume disputas → menos risco e regulação.
- As mesmas contas BR/PT das assinaturas servem de plataforma Connect por região.

### M. Em aberto
- Tenants fora de Brasil/Portugal (ex.: Espanha) → plataforma Lodgra PT (UE).
- Meios de pagamento locais: Pix/boleto (BR), MB WAY/Multibanco (PT) — ativar por conta.
- Política de reembolso exibida ao hóspede (hoje manual) — definir por tenant.
