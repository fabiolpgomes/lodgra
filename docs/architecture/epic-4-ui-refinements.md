# Epic 4: UI/UX Refinements — Filtros Inteligentes & Enriquecimento de Dados

**Status:** Created
**Prioridade:** Média (Sprint atual)
**Data Criação:** 2026-03-13
**Owner:** Morgan (PM)

---

## Epic Goal

Melhorar a usabilidade dos módulos Despesas e Reservas através de filtros contextuais e enriquecimento de dados, permitindo aos proprietários visualizar e organizar informações com mais eficiência.

---

## Epic Description

### Contexto do Sistema Existente

- **Módulo de Despesas:** Lista despesas por categoria, sem filtros por propriedade/período
- **Módulo de Reservas:** Mostra nome do hóspede apenas, sem informação de propriedade
- **Multi-tenancy:** Já implementado — cada utilizador vê apenas dados da sua organização
- **Segurança:** RLS policies garantem isolamento de dados

### Melhorias Planeadas

#### 1. Despesas — Filtros + Reorganização
- Adicionar filtro de propriedade (selector com "Todas" + lista)
- Adicionar filtro de período (date range: data inicial/final)
- Reorganizar ordem de categorias (Água, Luz, Gás, Telefone, Internet, Condomínio, Limpeza, Lavanderia, Material de limpeza, Reparos, Seguro Residencial, Outros)
- Renomear coluna "Descrição" → "Forma de Pagamento"
- **Dados:** Armazenamento não muda (apenas visualização)

#### 2. Reservas — Property Filter & Enriquecimento
- Adicionar coluna "Propriedade" à listagem (ao lado de "Hóspede")
- Adicionar filtro de propriedade (dropdown com "Todas" + lista)
- Aplicar filtro imediatamente quando alterado
- Persistir seleção na sessão

### Success Criteria

- ✅ Despesas filtráveis por propriedade e período (aplicação imediata)
- ✅ Categorias exibidas na ordem definida
- ✅ Reservas mostram sempre nome da propriedade
- ✅ Filtro de propriedade em Reservas funciona (toggle all/single)
- ✅ Sem mudanças de schema ou APIs existentes
- ✅ RLS policies continuam garantindo segurança

---

## Stories Incluídas

### Story 4.1: Despesas — Filtros por Propriedade & Período
**Arquivo:** `docs/stories/4.1.story.md`

**Tarefas principais:**
- Adicionar componentes de filtro (property selector, date range picker)
- Implementar lógica de filtro e persistência
- Reorganizar ordem de categorias
- Renomear coluna "Descrição" → "Forma de Pagamento"
- Testes com múltiplas propriedades

**Predicted Agents:** @dev
**Quality Gates:** Pre-Commit review (low risk, UI-focused)
**Risk Level:** 🟢 LOW

---

### Story 4.2: Reservas — Property Filter & Enriquecimento de Dados
**Arquivo:** `docs/stories/4.2.story.md`

**Tarefas principais:**
- Adicionar coluna "Propriedade" à listagem
- Implementar property filter (dropdown)
- Adicionar lógica de filtro e persistência
- Testes com múltiplas propriedades
- Validação de RLS

**Predicted Agents:** @dev
**Quality Gates:** Pre-Commit review (low risk, UI-focused)
**Risk Level:** 🟢 LOW

---

## Compatibility Requirements

| Requisito | Status | Notas |
|-----------|--------|-------|
| Nenhuma mudança de schema | ✅ Confirmado | Visualização apenas |
| RLS policies continuam funcionando | ✅ Confirmado | Multi-tenancy preservado |
| APIs existentes não sofrem mudanças | ✅ Confirmado | Apenas frontend |
| Seguir padrões de UI existentes | ✅ Confirmado | Componentes + estilos consistentes |

---

## Risk Assessment

### Primary Risks

| Risk | Mitigation | Owner |
|------|-----------|-------|
| Filtros aplicados incorretamente | Testes com dados reais, validação de lógica | @dev |
| Filtros não persistem entre sessões | Usar localStorage ou state management | @dev |
| Regressões em funcionalidades existentes | Teste de integração com módulos relacionados | @dev |

### Rollback Plan

- Stories podem ser revertidas via git revert
- Nenhuma mudança de banco de dados
- Deployment é seguro (apenas código frontend)

---

## Definition of Done

- [ ] Story 4.1 implementada e verificada
- [ ] Story 4.2 implementada e verificada
- [ ] Funcionalidade testada com dados reais
- [ ] Sem regressões em funcionalidades existentes
- [ ] Code review aprovado (@dev)
- [ ] `npm run lint` passa sem erros
- [ ] `npm run build` passa sem erros
- [ ] Epic status actualizado para "Done"

---

## Handoff Notes

**Para @dev:**

Este é um epic com escopo bem definido e baixo risco. As duas stories são independentes mas complementares (ambas envolvem UI/filtering).

**Recomendação de sequência:**
1. Começar com Story 4.1 (Despesas) — mais isolada
2. Depois Story 4.2 (Reservas) — similar em padrão

**Padrão a seguir:**
- Adicionar componente Filter (novo)
- Modificar componente List (adicionar coluna ou reorganizar)
- Aplicar filtros no frontend (sem mudanças de query backend)
- Persistir seleção em localStorage
- Testes com múltiplas propriedades

---

## Metadata

```yaml
epic_id: 4
epic_name: UI/UX Refinements — Filtros Inteligentes & Enriquecimento de Dados
created_at: 2026-03-13
created_by: Morgan (PM)
status: Created
stories: 2
estimated_duration: 2-3 dias
tech_stack: React + TypeScript + Supabase
breaking_changes: false
database_migrations: false
```

---

**Próximo Passo:** Assignar stories a @dev e iniciar implementação
