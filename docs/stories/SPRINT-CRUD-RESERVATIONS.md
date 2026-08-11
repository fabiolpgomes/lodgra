# Sprint: CRUD Operations para Reservations

**Sprint ID:** CRUD-RESERVATIONS-001  
**Data de Início:** 2026-08-12  
**Duração:** 1 semana (40h)  
**Status:** 📋 PLANEJADO  

---

## 🎯 Objetivo da Sprint

Implementar operações CRUD completas (Create, Read, Update, Delete) na página de detalhes de reservas, permitindo gestão total de reservações direto da UI.

---

## 📊 Escopo

### Story 1: UPDATE - Editar Detalhes da Reserva
**Status:** 📋 TODO  
**Estimativa:** 6h  
**Prioridade:** 🔴 ALTA

#### Tarefas
- [ ] Criar form de edição em modal/inline
- [ ] Adicionar campos editáveis:
  - [ ] guest_name (texto)
  - [ ] guest_email (email)
  - [ ] guest_phone (telefone)
  - [ ] reservation_status (dropdown: pending|confirmed|cancelled)
  - [ ] total_price (decimal)
- [ ] Implementar validação de dados
- [ ] Criar endpoint PUT `/api/reservations/[id]`
- [ ] Adicionar otimistic UI update
- [ ] Testes E2E
- [ ] Audit logging (quem editou, quando)

#### Critérios de Aceição
- ✅ Usuário consegue editar qualquer campo
- ✅ Validação previne dados inválidos
- ✅ Mudanças salvas imediatamente no Supabase
- ✅ UI mostra loading state durante save
- ✅ Toast de sucesso/erro aparece
- ✅ Histórico de edições registrado em audit log

---

### Story 2: DELETE - Cancelar/Deletar Reserva
**Status:** 📋 TODO  
**Estimativa:** 5h  
**Prioridade:** 🟠 MÉDIA

#### Tarefas
- [ ] Implementar soft-delete (não remove do DB, apenas marca como deleted_at)
- [ ] Criar modal de confirmação com advertência
- [ ] Opções: "Cancelar Reserva" vs "Deletar Permanentemente"
- [ ] Criar endpoint DELETE `/api/reservations/[id]`
- [ ] Validar permissões (só admin ou owner)
- [ ] Audit logging (quem deletou, quando, motivo)
- [ ] Reintegração com lista (filtro para excluir deletadas)

#### Critérios de Aceição
- ✅ Modal de confirmação obrigatório
- ✅ Soft-delete preserva dados para auditoria
- ✅ Reserva desaparece da lista após delete
- ✅ Undo funciona por 30 dias (soft-delete recovery)
- ✅ Auditoria registra quem deletou

---

### Story 3: READ - Melhorias na Página de Detalhe
**Status:** ✅ PARCIAL (já tem detalhes básicos)  
**Estimativa:** 3h  
**Prioridade:** 🟡 MÉDIA

#### Tarefas
- [ ] Adicionar histórico de alterações (changelog)
- [ ] Mostrar audit log de quem editou quando
- [ ] Timeline visual de eventos (created → confirmed → checked-in → checked-out)
- [ ] Adicionar relacionamentos adicionais:
  - [ ] Histórico de preços
  - [ ] Notas/comentários privados
  - [ ] Documentos anexados (comprovante de pagamento, etc)

#### Critérios de Aceição
- ✅ Timeline visual aparece na página
- ✅ Audit log mostra todas as mudanças
- ✅ Performance < 200ms mesmo com histórico grande

---

### Story 4: CREATE - Criar Reserva Manualmente (Melhorias)
**Status:** ⚠️ PARCIAL (existe form básico, precisa melhorias)  
**Estimativa:** 4h  
**Prioridade:** 🟠 MÉDIA

#### Tarefas
- [ ] Melhorar validação de datas (check-out > check-in)
- [ ] Auto-calcular número de noites
- [ ] Sugerir preço baseado em histórico
- [ ] Validar disponibilidade (conflito de datas)
- [ ] Enviar email de confirmação ao hóspede
- [ ] Integrar com calendar para visualizar conflitos

#### Critérios de Aceição
- ✅ Criação rápida e intuitiva
- ✅ Validações previnem erros
- ✅ Email de confirmação enviado
- ✅ Aparece imediatamente no calendar

---

## 🔧 Implementação Detalhada

### Backend Changes Necessárias

#### 1. RLS Policies para CRUD
```sql
-- UPDATE: Usuário pode editar se é owner ou admin
CREATE POLICY "users_can_update_own_reservations"
ON reservations
FOR UPDATE
USING (
  auth.uid()::text = (
    SELECT user_id FROM properties 
    WHERE id = (
      SELECT property_id FROM property_listings 
      WHERE id = reservations.property_id
    )
  )
);

-- DELETE: Soft-delete com audit
CREATE POLICY "users_can_soft_delete"
ON reservations
FOR UPDATE
USING (
  deleted_at IS NULL AND
  auth.uid()::text = (SELECT user_id FROM properties...)
);
```

#### 2. API Routes Necessárias
- `PUT /api/reservations/[id]` - Editar
- `DELETE /api/reservations/[id]` - Deletar (soft-delete)
- `GET /api/reservations/[id]/audit` - Histórico
- `POST /api/reservations/[id]/comments` - Adicionar notas

#### 3. Database Migrations
```sql
-- Adicionar colunas se não existirem
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ADD COLUMN IF NOT EXISTS edited_by UUID;
ADD COLUMN IF NOT EXISTS edit_reason TEXT;

-- Audit table
CREATE TABLE IF NOT EXISTS reservation_audit_log (
  id UUID PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  action VARCHAR(50), -- 'created', 'updated', 'deleted'
  changed_fields JSONB,
  changed_by UUID,
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT
);
```

### Frontend Components

#### 1. EditReservationModal
- Form inputs para cada campo
- Validação em tempo real
- Confirmação antes de save
- Toast de sucesso/erro

#### 2. DeleteConfirmationDialog
- Aviso sobre consequências
- Opção de motivo/notas
- Botão de "Confirmar Deletar"
- Recovery option (undo em 30 dias)

#### 3. ReservationTimeline
- Visual de estados (created → confirmed → cancelled)
- Timestamps e quem fez cada ação
- Expandível para ver detalhes

#### 4. AuditLog
- Tabela de histórico de edições
- Filtros por tipo de ação
- Export para CSV

---

## 📅 Cronograma Proposto

### Dia 1 (12/08) - Preparação
- [ ] Setup branches e estrutura
- [ ] RLS policies implementadas
- [ ] Testes de permissão

### Dia 2-3 (13-14/08) - UPDATE
- [ ] Form de edição
- [ ] Validação
- [ ] API route
- [ ] Testes

### Dia 4 (15/08) - DELETE
- [ ] Modal de confirmação
- [ ] Soft-delete logic
- [ ] Audit logging
- [ ] Testes

### Dia 5 (16/08) - Polish & Testing
- [ ] Melhorias visuais
- [ ] Performance tunning
- [ ] QA completo
- [ ] Documentação

---

## 🧪 Plano de Testes

### Unit Tests
- Validação de campos
- Cálculo de noites
- Detecção de conflitos

### Integration Tests
- CREATE reserva + apareça na lista
- UPDATE + auditoria registre mudanças
- DELETE soft + recovery possível

### E2E Tests
- Fluxo completo: criar → editar → ver histórico → deletar

---

## 📋 Dependências

- ✅ Página de detalhe já existe
- ✅ Schema de reservations está estável
- ⚠️ RLS policies precisam ser revisadas
- ⚠️ Audit table precisa ser criada

---

## 🎬 Next Steps

1. **Criar stories** no backlog usando este documento
2. **Estimar** com time (Planning Poker)
3. **Iniciar desenvolvimento** com @dev (Dex)
4. **QA completo** com @qa (Quinn)
5. **Deploy** com @devops (Gage)

---

## 📌 Notas

- **Soft-delete é obrigatório** para auditoria/compliance
- **RLS policies críticas** para segurança multi-tenant
- **Audit logging essencial** para rastrear mudanças
- **Testes são must-have** após recuperação de dados desta semana

---

**Autor:** Claude Code  
**Data:** 2026-08-11  
**Status:** 📋 Pronto para Planning Meeting
