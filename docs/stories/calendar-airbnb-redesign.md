# Epic: Calendar - Redesign Airbnb Style

**Status:** Planning  
**Priority:** Critical  
**Estimativa:** 6-8 sprints  
**Epic:** Calendário - Versão Airbnb Pro

## Objetivo

Redesenhar completamente o calendário da propriedade para ficar como Airbnb:
- Layout: Calendário grande no centro + painel de controle à direita
- Mostrar reservas dentro do calendário com informações visuais
- 5 cards configuráveis com lógica completa de pricing
- Integração com booking e sistema de descontos

## Referência Visual

Ver `Calendario-pro-web.png` - Layout Airbnb com:
- Calendário 7 dias/semana com reservas em cards
- Sidebar direita com Preços, Descontos, Disponibilidade, Cancelamentos
- Preços por dia no calendário
- Seleção de período com drag

---

## Stories Planejadas

### Story 1: Layout & Structure (Sprint 1-2)
Redesenhar o layout CalendarWithSettings para estilo Airbnb

**AC:**
- [ ] Calendário occupa 70% da tela (centro-left)
- [ ] Sidebar direita occupa 30% com 5 cards
- [ ] Responsivo: Mobile mostra calendário full-width, cards em abas
- [ ] Month/Year picker funcionando (já pronto)
- [ ] Botão voltar para hub

**Componentes:**
- CalendarGrid (novo)
- SettingsSidebar (atualizar)
- ReservationCards (novo)

---

### Story 2: Reservas no Calendário (Sprint 2-3)
Exibir reservas como cards dentro do calendário (igual hub)

**AC:**
- [ ] Reservas aparecem como cards dentro das células
- [ ] Mostrar: Guest name, Check-in/out, Price, Status
- [ ] Cores por status (Confirmed=azul, Hosting=verde, etc)
- [ ] Clicar reserva mostra modal com detalhes
- [ ] Detalhe modal: Name, Dates, Guests (adults/kids), Policy, Total price

**Modal Detalhes:**
```
Nome: Martial Godard
Check-in: 27/08/2026
Check-out: 31/08/2026
Reserva em: 02/08/2026
Hóspedes: 4 adultos, 2 crianças
Política: Firme
Valor: €1.200
Dias: 4 noites
[Imprimir] [Editar] [Cancelar]
```

---

### Story 3: Card Preços (Sprint 3-4)

**AC:**
- [ ] Preço Base por Noite (€ input)
- [ ] Botão "Preencher Calendário" com preço base (já pronto)
- [ ] Preencher um período selecionado com preço
- [ ] Desabilitar dias bloqueados ao preencher
- [ ] Toggle "Preços Inteligentes" (desabilitado, para futura feature)
  - Se ativo: habilitar Preço Mínimo e Máximo
- [ ] Salvamento em real-time

**Lógica:**
1. Usuário clica em dia no calendário
2. Ou seleciona período (drag)
3. Abre modal: "Definir Preço para [data(s)]"
4. Informar valor
5. Salva em `daily_prices` table
6. Calendário atualiza com novo preço

---

### Story 4: Card Descontos (Sprint 4)

**AC:**
- [ ] Semanal: 7+ noites → percentual
  - Mostrar: "Média semanal: €894"
- [ ] Mensal: 28+ noites → percentual
  - Mostrar: "Média mensal: €1.724"
- [ ] Fidelidade (Clientes Recorrentes): percentual
  - Flag: Aplicar desconto a clientes com histórico
  - Info: "Desconto extra para clientes que já estiveram conosco"

**Cálculo:**
```
Preço final = (Preço base × Dias) - (Desconto semanal/mensal) - (Desconto fidelidade)
```

**BD Schema:**
```sql
- discounts table:
  - property_id
  - discount_type (weekly, monthly, loyalty)
  - percentage
  - apply_to_returning_guests (boolean)
```

---

### Story 5: Card Disponibilidade (Sprint 5)

**AC:**
- [ ] Mínimo de noites (input)
- [ ] Máximo de noites (input)
- [ ] Aviso prévio: Mesmo dia / 1 dia / 2 dias / 7 dias
- [ ] Toggle: "Permitir pedidos com menos de 1 dia"
  - Se ON: Reserva fica Pendente até aprovação
  - Se OFF: Respeita aviso prévio configurado
- [ ] Período de disponibilidade: 24m / 12m / 9m / 6m / 3m
- [ ] Toggle: "Permitir pedidos além deste período"
  - Se ON: Reserva fica Pendente
  - Se OFF: Data indisponível

**BD Schema:**
```sql
- availability_settings:
  - property_id
  - min_nights
  - max_nights
  - notice_days (0, 1, 2, 7)
  - require_approval_short_notice (boolean)
  - availability_period_months (24, 12, 9, 6, 3)
  - allow_beyond_period (boolean)
```

---

### Story 6: Card Cancelamentos (Sprint 6)

**AC:**
- [ ] Dropdown: Flexível / Moderada / Limitada / Firme / Rígida / Não Reembolsável
- [ ] Cada tipo mostra termos com Tooltip "Saiba Mais"
- [ ] Permitir selecionar política por data/período no calendário
- [ ] Mostrar política em reserva existente

**Tipos:**

**Flexível:**
- Reembolso 100% até 1 dia antes check-in
- Reembolso parcial 1 dia após check-in
- Info: "Cobrada 1 noite se cancele <1 dia. Extra noite se cancelar durante estadia"

**Moderada:**
- Reembolso 100% até 5 dias antes
- Reembolso 50% se 5 dias após check-in
- Info: "Cobrada 1 noite extra + 50% reembolso se <5 dias ou durante"

**Limitada:**
- Reembolso 100% até 14 dias antes
- Reembolso 50% se 7-14 dias antes
- Info: "50% reembolso se 7-14 dias. Sem reembolso após"

**Firme:**
- Reembolso 100% até 30 dias antes
- Reembolso 50% se 7-30 dias antes
- Info: "50% reembolso se 7-30 dias. Sem reembolso após"

**Rígida (Long-term):**
- Reembolso 100% até 30 dias antes
- Reembolso 50% se 7-30 dias antes
- (Mesma lógica que Firme)

**Não Reembolsável:**
- Desconto (10% típico) + Reembolso 0%
- Info: "Desconto 10%, mas sem reembolso se cancelar"

**BD Schema:**
```sql
- cancellation_policies:
  - property_id
  - policy_type (flexible, moderate, limited, firm, rigid, non_refundable)
  - discount_non_refundable (10)
  - applies_to_dates (range or all)
```

---

### Story 7: Card Taxas (Sprint 6)

**AC:**
- [ ] Taxa de limpeza (€ fixo ou % da reserva)
- [ ] Taxa de serviço (€ ou %)
- [ ] Taxa de hóspede adicional
- [ ] Ativa/Desativa por data ou período
- [ ] Aplicada automaticamente ao calcular reserva

**BD Schema:**
```sql
- property_taxes:
  - property_id
  - tax_type (cleaning, service, extra_guest)
  - amount (value or percentage)
  - applies_to_dates
```

---

### Story 8: Bloqueio de Datas (Sprint 7)

**AC:**
- [ ] Selecionar dia ou período no calendário
- [ ] Modal: "Bloquear Data"
- [ ] Motivo: dropdown (Manutenção, Limpeza, Pessoal, Outro)
- [ ] Dias bloqueados aparecem cinza no calendário
- [ ] Não permitir reserva em datas bloqueadas
- [ ] Desbloquear datas com um clique

**BD Schema:**
```sql
- blocked_dates:
  - property_id
  - date_range (start, end)
  - reason
  - created_at
```

---

### Story 9: Cálculo de Preço de Reserva (Sprint 8)

**AC:**
- [ ] Ao criar booking: verificar calendário para prices
- [ ] Se vazio: usar property.base_price
- [ ] Calcular: Σ(daily_price × dias)
- [ ] Aplicar desconto semanal (7+ noites)
- [ ] Aplicar desconto mensal (28+ noites) - sobrescreve semanal
- [ ] Aplicar desconto fidelidade (se cliente recorrente)
- [ ] Aplicar taxa de limpeza/serviço
- [ ] Mostrar breakdown transparent:
  ```
  Preço: €100/noite × 7 noites = €700
  Desconto semanal: -€70 (10%)
  Desconto fidelidade: -€35 (5% da taxa com desconto)
  Taxa de limpeza: +€50
  ────────────────────────
  Total: €645
  ```

**Regra:** Descontos se aplicam em cascata APÓS se confirmar número mínimo de noites

---

### Story 10: Visualizar Detalhes da Reserva (Sprint 8)

**AC:**
- [ ] Clicar em reserva no calendário
- [ ] Abre painel direito com:
  - Guest name + avatar
  - Check-in / Check-out
  - Reservation date (quando foi feita)
  - Guests: 2 adultos, 1 criança (etc)
  - Cancellation policy: Flexível
  - Price breakdown
  - Total amount
  - Status badge
- [ ] Botões: Imprimir, Editar, Cancelar

---

### Story 11: Mobile - Calendar Layout (Sprint 9)

**AC:**
- [ ] Mobile: Calendário full-width
- [ ] Cards em abas (Preços | Descontos | Disponibilidade | Cancelamentos | Taxas)
- [ ] Swipe entre abas
- [ ] Tap em dia abre modal de preço
- [ ] Tap em reserva mostra detalhes
- [ ] Back button voltar ao hub

---

## Dependências

- ✅ Auth middleware (já pronto)
- ✅ Fetch reservations API (já pronto)
- ✅ Daily prices API (já pronto)
- 🔲 Discounts API (criar)
- 🔲 Availability API (criar)
- 🔲 Cancellation policies API (criar)
- 🔲 Taxes API (criar)
- 🔲 Block dates API (criar)

---

## Database Schema Changes

```sql
-- Discounts
CREATE TABLE discounts (
  id uuid PRIMARY KEY,
  property_id uuid NOT NULL,
  discount_type varchar (weekly, monthly, loyalty),
  percentage numeric,
  apply_to_returning_guests boolean,
  created_at timestamp
);

-- Availability Settings
CREATE TABLE availability_settings (
  id uuid PRIMARY KEY,
  property_id uuid UNIQUE,
  min_nights integer,
  max_nights integer,
  notice_days integer (0, 1, 2, 7),
  require_approval_short_notice boolean,
  availability_period_months integer,
  allow_beyond_period boolean
);

-- Cancellation Policies
CREATE TABLE cancellation_policies (
  id uuid PRIMARY KEY,
  property_id uuid,
  policy_type varchar,
  discount_non_refundable numeric,
  applies_from date,
  applies_to date
);

-- Property Taxes
CREATE TABLE property_taxes (
  id uuid PRIMARY KEY,
  property_id uuid,
  tax_type varchar (cleaning, service, extra_guest),
  amount numeric,
  is_percentage boolean
);

-- Blocked Dates
CREATE TABLE blocked_dates (
  id uuid PRIMARY KEY,
  property_id uuid,
  date_start date,
  date_end date,
  reason varchar,
  created_at timestamp
);
```

---

## Notas Importantes

1. **Preço da Reserva**: Sempre buscar do calendário (daily_prices). Se vazio, usar base_price
2. **Descontos em Cascata**: Aplicar nesta ordem:
   - Desconto semanal OU mensal (não ambos)
   - Depois desconto fidelidade
3. **Flag Inteligente**: Preparar schema mas NÃO implementar lógica ainda
4. **Política por Data**: Permitir sobrescrever política geral para períodos específicos
5. **FAQ Page**: Criar página de FAQ (cancelamentos, reembolsos, serviços extras)

---

## Criterios de Aceitação (Visão Geral)

- [ ] Layout Airbnb 100% funcional
- [ ] Reservas aparecem no calendário com detalhes
- [ ] Todos os 5 cards configuráveis e salvando
- [ ] Cálculo de preço aplicando descontos corretamente
- [ ] Mobile-first responsive
- [ ] Sem quebra de features existentes
- [ ] 90%+ teste coverage
- [ ] Zero technical debt

---

## Próximo Passo

Criar story 1: Layout & Structure (Sprint 1-2)
