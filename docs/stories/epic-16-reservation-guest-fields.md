# Epic 16: Reservas — Dados de Hóspedes e PDF

**Status:** Ready for Dev
**Priority:** High
**Effort:** Low-Medium
**Risk:** Low

## Problem Statement

O cadastro de reservas não regista o número de adultos nem de crianças, informação essencial para a gestão operacional e para comunicação com hóspedes. O campo "Notas" não é incluído no PDF individual nem no export de listagem.

## Goal

Enriquecer o cadastro de reservas com dados de ocupação (adultos/crianças) e garantir que as Notas e esses dados apareçam em todos os outputs de impressão/PDF.

## Affected Screens

1. `/reservations/new` — formulário de criação
2. `/reservations/[id]` — detalhe da reserva
3. `/reservations/[id]/edit` — edição
4. `/reservations/[id]/print` ou PDF individual — impressão
5. `/reservations/export` — export PDF listagem

## Acceptance Criteria

- [ ] Campo "Número de Adultos" (inteiro ≥ 1) no cadastro de reservas
- [ ] Campo "Número de Crianças" (inteiro ≥ 0, até 12 anos) no cadastro
- [ ] Campos persistidos na base de dados
- [ ] PDF/impressão individual inclui adultos, crianças e notas
- [ ] Export PDF listagem inclui colunas: Adultos, Crianças, Notas

## Constraints

- Migração de base de dados necessária (adicionar colunas `adults`, `children`)
- Campo `notes` já existe na tabela `reservations` — apenas expor no PDF
- Sem breaking changes no fluxo de importação de OTAs

## Stories

- [ ] Story 16.1: Migração DB — colunas adults e children em reservations
- [ ] Story 16.2: UI — campos adultos/crianças no formulário de reserva
- [ ] Story 16.3: PDF individual — incluir adultos, crianças e notas
- [ ] Story 16.4: Export PDF listagem — adicionar colunas adultos, crianças, notas

## Agents

- @dev — Implementação completa
- @devops — Push e deploy

## Strategic Note

Dados de ocupação (adultos/crianças) são campos obrigatórios para o feed Google Vacation Rentals (Fase futura). Implementar correctamente desde o início evita retrabalho.
