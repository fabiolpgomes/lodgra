# Lodgra Cleaner Operations Portal — Product Requirements Document

**Document Version:** 1.0  
**Last Updated:** 2026-05-21  
**Status:** Ready for Implementation  
**Author:** Morgan (PM) — Synkra AIOS  

---

## Executive Summary

**Cleaner Operations Portal** é um módulo novo dentro da plataforma **Lodgra** que permite proprietários (managers) coordenar tarefas de limpeza entre cleaners e fornece um portal dedicado para cleaners gerenciar seu trabalho.

**Objetivo:** Automatizar e rastrear o workflow de limpeza pós-checkout, melhorando qualidade, velocidade e accountability.

**Timeline:** 3-4 semanas (Epic 29 — Portal funcional) + 2-3 semanas (Epic 30 — WhatsApp integration)  
**Mercados:** 🇧🇷 Brasil, 🇪🇺 Europa, 🇺🇸 USA  
**Idiomas:** pt-BR, es-ES, en-US

---

## 1. ANÁLISE DO PROJETO EXISTENTE

### 1.1 Contexto de Negócio

**Lodgra** é uma plataforma global de gestão de propriedades de curta duração (short-term rentals). O rebranding de Home Stay para Lodgra (2026) incluiu expansão para 3 mercados e suporte multi-moeda.

**Funcionalidades Core:**
- Gestão de propriedades multi-moeda (EUR, BRL, USD + 5 outras)
- Sincronização iCal automática (Airbnb, Booking.com, VRBO)
- Gestão de reservas com overbooking detection
- Gestão de despesas e dashboard financeiro
- Relatórios exportáveis (PDF, Excel)
- Gestão de equipa com RBAC

### 1.2 Stack Técnico Confirmado

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (App Router) + React 19 |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Backend | Supabase (Auth, DB, Storage, RLS) |
| Pagamentos | Stripe (multi-moeda) |
| Infraestrutura | Vercel, Upstash Redis, Sentry |
| i18n | next-intl (3 locales) |
| Deploy | Vercel (CI/CD automático) |

**Versões:**
- Node.js 24 LTS
- TypeScript ^5
- Next.js ^16.1.6
- Supabase ^2.90.1

### 1.3 Padrões de Código Observados

✅ Server Components (async page.tsx) + Client Components  
✅ RLS multi-tenant (`organization_id` isolation)  
✅ RBAC: roles (admin, manager, viewer, staff)  
✅ AuthLayout wrapper para páginas protegidas  
✅ API Routes standardizadas (GET/POST/PATCH/DELETE)  
✅ Design system reutilizável (buttons, cards, forms, tables)  

### 1.4 Estado do Cleaning Portal (PRÉ-EXISTENTE)

**Já Implementado:**
- Rota `/[locale]/cleaning` com page.tsx
- API routes `/api/cleaning` (GET/POST)
- Tabelas de schema: `cleaning_checklists`, `cleaning_checklist_items`
- Autenticação e autorização

**Não Concluso:**
- CleaningPageClient component (parcial)
- 14 stories em Epic 29 (estrutura, não implementação)

### 1.5 Documentação Disponível

- ✅ README.md (completo com features e stack)
- ✅ Brand Guidelines
- ✅ Commercial Auth Flow
- ✅ Docs técnicos de features existentes
- ✅ 14 Stories de Cleaner Portal (Epic 29)

---

## 2. REQUIREMENTS

### 2.1 Requisitos Funcionais (FR)

**Gestão de Tarefas de Limpeza:**
- **FR1:** Manager cria tarefas de limpeza (cleaning_tasks) vinculadas a propriedades/reservas
- **FR2:** Cleaner recebe token de acesso (cleaner_access_tokens) para aceder ao portal sem password
- **FR3:** Cleaner visualiza dashboard com tarefas atribuídas (hoje/próximas)
- **FR4:** Cleaner marca itens do checklist como completo (cleaning_checklist_responses)
- **FR5:** Cleaner fotografa prova de limpeza (cleaning_photos no Supabase Storage)
- **FR6:** Manager visualiza status de todas as tarefas (dashboard)
- **FR7:** Relatório de limpeza por propriedade/período

**Checklist Templates:**
- **FR8:** Manager cria templates de checklist (cleaning_checklist_templates) por organização/propriedade
- **FR9:** Reutiliza templates em múltiplas tarefas
- **FR10:** Items customizáveis por categoria (quarto, banheiro, cozinha, geral)

**Autenticação sem Password:**
- **FR11:** Cleaner acede via link com token (ex: lodgra.io/cleaning?token=xyz)
- **FR12:** Token expira após X horas (configurável)
- **FR13:** Invalidação de tokens após logout

### 2.2 Requisitos Não-Funcionais (NFR)

**Performance:**
- **NFR1:** Dashboard carrega em < 2s (queries otimizadas)
- **NFR2:** Upload de fotos requer compressão automática (max 2MB)
- **NFR3:** RLS policies executam em < 100ms

**Segurança:**
- **NFR4:** RLS isolação por organization_id + cleaner_id
- **NFR5:** Storage bucket cleaning-photos com acesso restrito (apenas cleaner + manager)
- **NFR6:** Tokens com rate-limiting (max 3 tentativas falhadas = bloqueio 15min)
- **NFR7:** Auditoria: logs de quem modificou cada checklist item

**Compatibilidade Linguística:**
- **NFR8:** Interface traduzida: pt-BR, es-ES, en-US
- **NFR9:** Checklists padrão com labels traduzidos

**Conformidade:**
- **NFR10:** LGPD/GDPR: fotos deletáveis; dados exportáveis
- **NFR11:** Logging de acessos para compliance

### 2.3 Requisitos de Compatibilidade (CR)

**Com Sistema Existente:**
- **CR1:** Cleaning Portal integra com user_profiles (guest_type='cleaner')
- **CR2:** Mantém RLS padrão (organization_id isolation) — coexiste com outras features
- **CR3:** Reservations integration: se há checklist_template_id em reservations, vincula automaticamente
- **CR4:** Storage: usa bucket existing (cleaning-photos) com mesmas policies RLS
- **CR5:** Autenticação: usa Supabase Auth existente (sem novo provider)
- **CR6:** Dashboard: componentes reutilizam design-system Lodgra (Tailwind + shadcn)

---

## 3. USER INTERFACE ENHANCEMENT GOALS

### 3.1 Integração com Design System Existente

**Design System Lodgra (confirmado):**
- Tailwind CSS v4 + shadcn/ui components
- Dark mode (ThemeProvider)
- Componentes: Button, Card, Input, Select, Dialog, Table, Chart
- Layouts: AuthLayout (páginas autenticadas)
- Padrão: Server Components + Client Components

**Reutilização no Cleaner Portal:**
- ✅ Usa mesmos componentes (Button, Card, Form)
- ✅ Segue padrão AuthLayout
- ✅ Dark mode compatível
- ✅ Responsive (mobile-first) — cleaners usarão em tablets/phones no terreno
- ✅ Tailwind utilities existentes (spacing, colors, typography)

### 3.2 Screens e Views

| Screen | URL | Audiência | Propósito |
|--------|-----|-----------|-----------|
| Landing/Login | `/[locale]/cleaning?token=xyz` | Público | Verificação de token |
| Dashboard do Cleaner | `/[locale]/cleaning/dashboard` | Cleaner | Visualizar minhas tasks |
| Detalhe de Tarefa | `/[locale]/cleaning/tasks/[taskId]` | Cleaner | Trabalhar no checklist |
| Galeria de Fotos | `/[locale]/cleaning/tasks/[taskId]/photos` | Cleaner | Upload/view fotos |
| Dashboard do Manager | `/[locale]/cleaning/manage` | Manager | Coordenar tarefas |
| Criar Tarefa | `/[locale]/cleaning/manage/new` | Manager | Nova tarefa |
| Manage Checklists | `/[locale]/cleaning/manage/templates` | Manager | CRUD templates |
| Reports | `/[locale]/cleaning/manage/reports` | Manager | Analytics |

### 3.3 Componentes e Padrões UI

✅ **Navegação:**
- Menu lateral (sidebar) com opções: Dashboard, Meus Tasks, Templates (se manager)
- Breadcrumbs em pages > detail
- Mobile: hamburger menu

✅ **Componentes:**
- Buttons: primary (CTA), secondary (default), danger (delete)
- Cards: task card com property name + date + status badge
- Status badges: pending (yellow), in_progress (blue), done (green), issue (red)
- Forms: input (text), select (property), datepicker (scheduled_date), file upload

✅ **Tipografia/Cores:**
- Titles: H2 (18px, bold)
- Body: regular (14px)
- Labels: 12px, gray-600
- Colors: reutiliza Lodgra palette (blue/primary, green/success, red/error)

✅ **Mobile-First:**
- Layouts stack verticalmente em mobile
- Touch-friendly buttons (min 48px)
- Foto upload com preview
- Checklist items com swipe gestures (opcional)

---

## 4. TECHNICAL CONSTRAINTS & INTEGRATION REQUIREMENTS

### 4.1 Stack Tecnológico

**Confirmado (reutilização):**
- **Languages:** TypeScript (100%), pt-BR/es-ES/en-US
- **Frameworks:** Next.js 15 (App Router), React 19
- **Database:** Supabase PostgreSQL + RLS
- **Storage:** Supabase Storage (buckets)
- **Auth:** Supabase Auth (email/password + OAuth)
- **Frontend Styling:** Tailwind CSS v4 + shadcn/ui
- **Backend Runtime:** Node.js (Vercel/serverless)
- **Infrastructure:** Vercel, Upstash Redis, Sentry
- **External APIs:** Stripe (payments), Resend (email)

### 4.2 Estratégia de Integração

**Database Integration:**
- ✅ Usa RLS por `organization_id` (pattern existente)
- ✅ Nova tabelas: `cleaning_tasks`, `cleaning_checklist_templates`, `cleaning_checklist_items`, `cleaning_checklist_responses`, `cleaning_photos`, `cleaner_access_tokens`
- ✅ Foreign keys: tasks → properties, reservations, user_profiles; items → templates; responses → tasks
- ✅ Migrations versionadas (Supabase migrations)

**API Integration:**
- ✅ API Routes `/api/cleaning/*` (padrão Next.js)
- ✅ GET: listar tasks, detalhe task, fotos
- ✅ POST: criar task, mark item done, upload foto
- ✅ PATCH: atualizar status task
- ✅ DELETE: remover foto, deletar task
- ✅ Auth via Supabase getUser() (pattern existente)

**Frontend Integration:**
- ✅ Server Component: `/[locale]/cleaning/page.tsx` (já existe)
- ✅ Client Components: CleaningPageClient, TaskDetail, ChecklistForm
- ✅ React Hooks: useEffect, useState, useCallback
- ✅ Forms: react-hook-form + zod validation

**Teste Integration:**
- ✅ Jest + testing-library (pattern existente)
- ✅ Unit tests: API handlers, RLS policies
- ✅ E2E tests: Playwright (workflow completo)

### 4.3 Organização de Código

**Estrutura de Ficheiros:**
```
src/
├── app/[locale]/cleaning/
│   ├── page.tsx (server)
│   ├── dashboard/
│   │   └── page.tsx (server + CleaningDashboard client)
│   ├── tasks/
│   │   ├── [taskId]/
│   │   │   ├── page.tsx
│   │   │   └── photos/
│   │   │       └── page.tsx
│   │   └── new/
│   │       └── page.tsx (managers only)
│   └── manage/
│       ├── page.tsx (managers only)
│       ├── templates/
│       │   └── page.tsx
│       ├── reports/
│       │   └── page.tsx
│       └── [taskId]/
│           └── edit/
│               └── page.tsx
├── app/api/cleaning/
│   ├── route.ts (GET: list, POST: create)
│   ├── [id]/
│   │   ├── route.ts (GET: detail, PATCH: update status)
│   │   ├── checklist-items/
│   │   │   └── route.ts (PATCH: mark done)
│   │   └── photos/
│   │       └── route.ts (POST: upload, DELETE: remove)
│   ├── templates/
│   │   └── route.ts (GET: list, POST: create)
│   └── access-tokens/
│       └── route.ts (POST: generate token)
├── components/features/cleaning/
│   ├── CleaningPageClient.tsx
│   ├── CleaningDashboard.tsx
│   ├── TaskDetail.tsx
│   ├── ChecklistForm.tsx
│   ├── PhotoGallery.tsx
│   ├── ManagerDashboard.tsx
│   ├── TemplateManager.tsx
│   └── TaskList.tsx
├── lib/supabase/
│   ├── cleaning.ts (helper functions: getTasks, createTask, etc.)
│   └── storage.ts (photo upload/delete)
├── types/
│   └── cleaning.ts (TypeScript interfaces)
└── __tests__/
    └── cleaning/
        ├── api.test.ts
        ├── rls.test.ts
        └── e2e.test.ts
```

**Padrões TypeScript:**
```typescript
// types/cleaning.ts
export interface CleaningTask {
  id: string
  organization_id: string
  property_id: string
  reservation_id?: string
  cleaner_id?: string
  checklist_template_id?: string
  status: 'pending' | 'in_progress' | 'done' | 'issue'
  scheduled_date: string
  scheduled_time?: string
  notes?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

// lib/supabase/cleaning.ts
export async function getTasks(
  supabase: SupabaseClient,
  organizationId: string,
  filters?: TaskFilters
): Promise<CleaningTask[]> {
  // Implementation
}
```

**Convenções de Nomenclatura:**
- Components: PascalCase (CleaningDashboard.tsx)
- Functions: camelCase (getTasks, createTask)
- Variables: camelCase (taskId, cleanerId)
- Database tables: snake_case (cleaning_tasks, cleaning_photos)
- Database columns: snake_case (scheduled_date, created_at)

### 4.4 Deployment & Operations

**Build Process:**
- `npm run build` (Next.js compilation)
- Vercel automatic deployment on push to main
- Environment variables: `.env.local` (dev), Vercel dashboard (prod)

**Database Migrations:**
- Supabase CLI: `supabase migration new <name>`
- Apply: `supabase db push` (dev), Vercel deployment triggers prod

**Monitoring:**
- Sentry: error tracking (já configurado)
- Logs: Vercel analytics + Supabase logs
- Alerts: Sentry → Slack (já integrado)

**Storage Management:**
- Supabase Storage bucket: `cleaning-photos`
- Auto-cleanup: old photos (>30 days) deleted via cron
- Backup: Supabase automated backups

### 4.5 Risk Assessment & Mitigation

| Risco | Severidade | Mitigação |
|-------|-----------|----------|
| RLS misconfiguration (data leak) | 🔴 CRITICAL | Testes automatizados de RLS, code review antes de merge |
| Storage quota exceeded (fotos) | 🟡 HIGH | Auto-compression, quotas por org, monitoring Sentry |
| Token expiration edge cases | 🟡 HIGH | Unit tests com token expirado, graceful redirect |
| Cleaner can't upload foto (network) | 🟢 MEDIUM | Retry logic, offline queue, sync on reconnect |
| Performance: many checklists | 🟢 MEDIUM | Database indexes, pagination, Redis cache (org tasks) |
| Existing features break | 🔴 CRITICAL | E2E tests, staging deployment, canary rollout |

---

## 5. EPIC STRUCTURE

### 5.1 Epic Approach Decision

Recomenda-se **2 Epics relacionadas mas independentes:**

- **Epic 29 — Cleaner Operations Portal** (Foundation + Portal UI)
  - 8 stories (schema, auth, portal UI, reports)
  - Duração: 3-4 semanas
  - MVP funcional
  
- **Epic 30 — WhatsApp Integration & Advanced Features** (Expansão)
  - 4-6 stories (webhooks, notifications, advanced)
  - Duração: 2-3 semanas
  - Opcional/expansão

**Rationale:** Epic 29 é auto-contida e funcional. Epic 30 é expansão. Separar permite:
- ✅ MVP delivery antes de WhatsApp
- ✅ Feedback real dos cleaners
- ✅ Escopo controlado
- ✅ Rollback independente se necessário

---

## 6. EPIC 29 — CLEANER OPERATIONS PORTAL

### 6.1 Epic Goal

Implementar um portal completo de gestão de limpeza que permita:
- Managers coordenar tarefas entre cleaners
- Cleaners gerenciar seu workflow e submeter evidência
- Organizers monitorar qualidade e produtividade

**Integration Requirements:**
- Integra com user_profiles (guest_type='cleaner')
- Usa RLS existente (organization_id isolation)
- Reutiliza design-system e componentes Lodgra
- Não quebra features existentes (reservas, propriedades, etc.)

---

### 6.2 Story 29.1 — Database Foundation: Schema de Limpeza

**User Story:**
```
Como administrador do sistema,
Quero ter as tabelas de base para o portal de cleaners criadas,
Para que as stories seguintes possam implementar funcionalidades 
sobre uma estrutura sólida.
```

**Acceptance Criteria:**
- [ ] AC1: Migração criada com todas as 6 tabelas (tasks, templates, items, responses, photos, tokens)
- [ ] AC2: RLS policies activas (organization_id + role-based access)
- [ ] AC3: Foreign keys corretos (tasks → properties, reservations, user_profiles)
- [ ] AC4: Storage bucket cleaning-photos criado com RLS
- [ ] AC5: Índices criados para queries comuns (property_id, organization_id, scheduled_date)
- [ ] AC6: Migração testada em staging sem erros

**Integration Verification:**
- [ ] IV1: Schema integra com user_profiles (guest_type='cleaner')
- [ ] IV2: RLS policies não quebram queries existentes (properties, reservations, organizations)
- [ ] IV3: Storage bucket isolado por organization_id

**Complexity:** 3 story points (MEDIUM)

---

### 6.3 Story 29.2 — Cleaner Authentication: Token-Based Access

**User Story:**
```
Como manager,
Quero gerar tokens de acesso para cleaners sem password,
Para que eles possam aceder ao portal via link seguro.
```

**Acceptance Criteria:**
- [ ] AC1: API POST /api/cleaning/access-tokens cria token (TTL configurável)
- [ ] AC2: Token hash armazenado em DB (nunca plain text)
- [ ] AC3: Verificação de token: GET /api/auth/verify-token?token=xyz
- [ ] AC4: Redirect automático: /[locale]/cleaning?token=xyz → dashboard (se válido)
- [ ] AC5: Token expira após X horas (default: 24h, configurável por org)
- [ ] AC6: Logout invalida token imediatamente
- [ ] AC7: Rate limiting: max 5 tentativas falhadas = bloqueio 15min

**Integration Verification:**
- [ ] IV1: Usa Supabase Auth existente (não novo provider)
- [ ] IV2: RLS policies permitem cleaner apenas ver suas tasks
- [ ] IV3: Não quebra autenticação existente (owners, managers, staff)

**Complexity:** 5 story points (MEDIUM-HIGH)

---

### 6.4 Story 29.3 — Manager Dashboard: Task Management UI

**User Story:**
```
Como manager,
Quero visualizar, criar e atribuir tarefas de limpeza,
Para que possa coordenar o trabalho dos cleaners.
```

**Acceptance Criteria:**
- [ ] AC1: Page /[locale]/cleaning/manage exibe tabela de todas as tasks
- [ ] AC2: Colunas: Property, Scheduled Date, Cleaner, Status, Actions
- [ ] AC3: Filtros: property, date range, status, cleaner
- [ ] AC4: Ações: View Detail, Edit, Assign Cleaner, Mark Done, Delete
- [ ] AC5: Form nova task: property select, date/time picker, cleaner select, template select, notes textarea
- [ ] AC6: Form é responsivo (mobile-friendly)
- [ ] AC7: Validações: property + date obrigatórios, data >= today

**Integration Verification:**
- [ ] IV1: Dashboard integra com existing design-system (buttons, tables, forms)
- [ ] IV2: Carrega properties/cleaners da organization_id atual
- [ ] IV3: Respeita RBAC (apenas admin/manager pode aceder)
- [ ] IV4: i18n funciona (pt-BR, es-ES, en-US)

**Complexity:** 5 story points (MEDIUM-HIGH)

---

### 6.5 Story 29.4 — Cleaner Dashboard: My Tasks UI

**User Story:**
```
Como cleaner,
Quero ver minhas tarefas de limpeza,
Para que saiba o que devo fazer hoje.
```

**Acceptance Criteria:**
- [ ] AC1: Page /[locale]/cleaning/dashboard com cards: "Today", "Upcoming", "Completed"
- [ ] AC2: Cada card mostra: Property Name, Date/Time, Status Badge
- [ ] AC3: CTA "Start Cleaning" navega para task detail
- [ ] AC4: Status badges: pending (yellow), in_progress (blue), done (green), issue (red)
- [ ] AC5: Mobile-friendly layout (vertical stack)
- [ ] AC6: Carrega apenas tarefas do cleaner actual (via auth)
- [ ] AC7: Auto-refresh a cada 30s (ou via WebSocket opcional)

**Integration Verification:**
- [ ] IV1: Usa AuthLayout existente
- [ ] IV2: RLS garante cleaner vê apenas suas tasks
- [ ] IV3: Design system: cards, badges, buttons Lodgra

**Complexity:** 3 story points (MEDIUM)

---

### 6.6 Story 29.5 — Task Detail: Checklist Management

**User Story:**
```
Como cleaner,
Quero marcar itens do checklist como completo,
Para que possa registrar o progresso da limpeza.
```

**Acceptance Criteria:**
- [ ] AC1: Page /[locale]/cleaning/tasks/[taskId] mostra detalhes completos
- [ ] AC2: Property info: name, address, check-in/out times
- [ ] AC3: Reservation info: guest name, check-in date (se aplicável)
- [ ] AC4: Checklist items com checkboxes + labels
- [ ] AC5: Items marcados como done → is_done=true, done_at=now (DB)
- [ ] AC6: Pode unmarcar (reverse action)
- [ ] AC7: Progresso visual: X/Y itens completos
- [ ] AC8: Status button: "Start", "In Progress", "Mark Complete"
- [ ] AC9: Manager notes field (read-only para cleaner)

**Integration Verification:**
- [ ] IV1: Carrega dados via API /api/cleaning/[id]
- [ ] IV2: Updates persistem em cleaning_checklist_responses
- [ ] IV3: RLS valida que cleaner é o assigned_to
- [ ] IV4: Mudança de status atualiza cleaning_tasks.status

**Complexity:** 5 story points (MEDIUM-HIGH)

---

### 6.7 Story 29.6 — Photo Upload: Evidence Collection

**User Story:**
```
Como cleaner,
Quero fotografar a propriedade como prova,
Para que o manager veja evidência do trabalho.
```

**Acceptance Criteria:**
- [ ] AC1: Page /[locale]/cleaning/tasks/[taskId]/photos com upload zone
- [ ] AC2: Drag-drop ou file picker para múltiplas imagens
- [ ] AC3: Preview antes de upload (thumbnail)
- [ ] AC4: Auto-compression (max 2MB, JPEG quality 80%)
- [ ] AC5: Upload para Supabase Storage (cleaning-photos/[org-id]/[task-id]/[filename])
- [ ] AC6: Filename: timestamp + random hash (ex: 1609459200_abc123.jpg)
- [ ] AC7: Metadata armazenado: uploaded_at, uploader_id, task_id
- [ ] AC8: Galeria mostra fotos com delete option
- [ ] AC9: Progress bar durante upload
- [ ] AC10: Error handling: network fail → retry logic

**Integration Verification:**
- [ ] IV1: Storage bucket RLS isolado por organization_id + cleaner_id
- [ ] IV2: API /api/cleaning/[id]/photos (POST upload, DELETE remove)
- [ ] IV3: Metadata persistido em cleaning_photos table
- [ ] IV4: Não quebra upload de despesas/propriedades (buckets diferentes)

**Complexity:** 5 story points (MEDIUM-HIGH)

---

### 6.8 Story 29.7 — Checklist Templates: Manager Configuration

**User Story:**
```
Como manager,
Quero criar templates de checklist personalizados,
Para que cada propriedade tenha itens específicos.
```

**Acceptance Criteria:**
- [ ] AC1: Page /[locale]/cleaning/manage/templates com CRUD
- [ ] AC2: Form criar template: name, description, property (optional), items list
- [ ] AC3: Items: label, category (quarto/banheiro/cozinha/geral), is_required flag
- [ ] AC4: Reorder items (drag-drop ou número)
- [ ] AC5: Salva como cleaning_checklist_templates + cleaning_checklist_items
- [ ] AC6: Editar template: atualiza items (adiciona, remove, reorder)
- [ ] AC7: Deletar template
- [ ] AC8: Template é reutilizável em múltiplas tasks
- [ ] AC9: Default template com 10 items padrão (se nenhum criado)

**Integration Verification:**
- [ ] IV1: RLS: organization_id isolation
- [ ] IV2: Quando criar task, pode reutilizar template
- [ ] IV3: Não quebra workflow de tasks existentes

**Complexity:** 5 story points (MEDIUM-HIGH)

---

### 6.9 Story 29.8 — Reports & Analytics: Cleaning Performance

**User Story:**
```
Como manager,
Quero visualizar relatórios de limpeza,
Para que possa monitorar qualidade e produtividade.
```

**Acceptance Criteria:**
- [ ] AC1: Page /[locale]/cleaning/manage/reports com filtros
- [ ] AC2: Filtros: date range, property, cleaner, status
- [ ] AC3: Métricas: total tasks, completion rate (%), avg time per task
- [ ] AC4: Tabela: property, cleaner, date, status, items completed, time spent
- [ ] AC5: Chart: tasks por dia (bar chart) ou completion trend (line chart)
- [ ] AC6: Export CSV com dados do período
- [ ] AC7: Mobile-friendly (tabela scrollable ou cards)

**Integration Verification:**
- [ ] IV1: Queries otimizadas (índices em place)
- [ ] IV2: RLS garante manager vê apenas org dele
- [ ] IV3: Design system: tables, charts (Chart.js/Recharts existente)

**Complexity:** 5 story points (MEDIUM-HIGH)

---

## Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial PRD | 2026-05-21 | 1.0 | Document creation — 8 stories structured | Morgan (PM) |

---

## Approvals

| Role | Status | Date | Notes |
|------|--------|------|-------|
| Product Owner (@po) | ⏳ Pending | — | Awaiting validation |
| Architect (@architect) | ⏳ Pending | — | Awaiting tech review |
| Dev Lead (@dev) | ⏳ Pending | — | Awaiting implementation feasibility |
| PM (@pm) | ✅ Complete | 2026-05-21 | Document authored |

---

**Next Steps:**
1. ✅ Compartilhar PRD com @po para validação
2. ⏳ @architect revisa constraints técnicas
3. ⏳ @dev avalia timeline e dependências
4. ⏳ @sm cria stories em mais detalhe (AC granulares)
5. ⏳ Implementação começa (Epic 29.1 — schema foundation)
