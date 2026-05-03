# Epic 17: Anexos de Documentos — Despesas e Propriedades

**Status:** Ready for Dev
**Priority:** High
**Effort:** Medium
**Risk:** Low-Medium (storage integration)

## Problem Statement

Gestores precisam de associar documentos físicos (recibos, contratos, comprovantes, vídeos de instrução) às despesas e propriedades. Actualmente não existe esta funcionalidade, obrigando a gestão manual fora do sistema.

O cadastro de propriedades tem um campo de URL de fotos não utilizado e fonte de confusão, dado que já existe upload funcional de fotos.

## Goal

Permitir upload e gestão de ficheiros em despesas e propriedades, usando o mesmo sistema de storage já implementado para fotos de propriedades.

## Affected Screens

1. `/expenses/new` + `/expenses/[id]/edit` — upload de documentos
2. `/expenses/[id]` — visualização de documentos
3. `/properties/[id]/edit` — upload de contratos/vídeos, remoção campo URL fotos
4. `/properties/[id]` — visualização de documentos

## Acceptance Criteria

- [ ] Despesas: upload de PDF, JPEG, Word (.doc/.docx), Excel (.xls/.xlsx)
- [ ] Propriedades: upload de PDF, Word (.doc/.docx), vídeos (mp4, mov, máx 100MB)
- [ ] Ficheiros listados e acessíveis na página de detalhe
- [ ] Remoção individual de ficheiros
- [ ] Campo "URL de fotos" removido do cadastro de propriedades
- [ ] Usar bucket Supabase Storage existente (novo path por entidade)
- [ ] Validação de tipo e tamanho no cliente e servidor

## Constraints

- Usar Supabase Storage (já configurado para fotos de propriedades)
- Vídeos: mp4/mov, máx 100MB por ficheiro
- Documentos: máx 20MB por ficheiro
- Sem alterações ao schema de fotos existente

## Stories

- [ ] Story 17.1: Despesas — upload e gestão de documentos
- [ ] Story 17.2: Propriedades — upload de documentos e vídeos + remoção campo URL fotos

## Agents

- @dev — Implementação completa
- @devops — Push e deploy

## Strategic Note

A infraestrutura de ficheiros aqui criada (upload, storage paths, componente reutilizável) serve de base para contratos de serviço e vídeos de instrução de check-in — conteúdo directamente relevante para páginas públicas de propriedade (Google Vacation Rentals, fase futura).
