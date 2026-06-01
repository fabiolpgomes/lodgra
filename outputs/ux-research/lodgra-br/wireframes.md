# Wireframes — Lodgra BR
**Data:** 2026-04-19 | **Persona:** Mariana (gestora 1-5 imóveis, Brasil)
**Fidelidade:** Lo-Fi | **Status:** Pronto para implementação

---

## Screen 1 — Onboarding Guiado (4 passos)

### Fluxo
Registo → Perfil → Imóvel → Canais iCal → Concluído → Dashboard

### Passo 1: Perfil
- Radio: "Tenho imóveis próprios" / "Administro de terceiros" / "Os dois"
- Selector: quantos imóveis (1 / 2 / 3 / 4-5)
- Determina se menu "Relatório Proprietário" aparece

### Passo 2: Primeiro Imóvel
- Nome do imóvel, Cidade, Moeda (BRL default), Preço/noite
- Dica: "pode adicionar mais depois"

### Passo 3: Canais iCal
- Campos para Airbnb, Booking, VRBO
- Link "Ver tutorial em vídeo"
- Botão "Pular esta etapa" (não-obrigatório)

### Passo 4: Confirmação
- Checklist do que foi feito
- "Primeira sincronização em andamento..."
- CTA: "Ir para o Dashboard"

### Regras
- Progresso salvo — pode fechar e retomar
- Barra de progresso (● ○ ○ ○) sempre visível

---

## Screen 2 — Dashboard Lucro Real

### Cards de Topo (5 métricas)
- 💰 Receita do mês + variação vs mês anterior
- 📉 Despesas do mês + variação
- ✅ Lucro Real (Receita - Despesas) + margem %  ← destaque principal
- 📅 Ocupação (X/30 noites + %)
- 🌟 Avaliação média + nº de avaliações

### Gráfico
- Receita vs Despesas — últimos 6 meses (barras)

### Tabela Despesas do Mês
- Categorias: Limpeza, Manutenção, Plataformas, Condomínio, Outros
- Valor, descrição, botão editar
- CTA: "+ Registrar Despesa"

### Próximas Reservas
- Lista: hóspede, datas, noites, valor
- Link "Ver Calendário"

### CTA Fixo no Fundo
- "📄 Gerar Relatório Proprietário"

### Selector de Imóvel
- Dropdown no header — troca contexto de todo o dashboard

---

## Screen 3 — Relatório Proprietário

### Configuração
- Selector: Imóvel, Período, Proprietário, Moeda
- "+ Adicionar Proprietário" inline

### Secções a incluir (checkboxes)
- ✅ Resumo geral, ✅ Reservas, ✅ Receita bruta, ✅ Despesas, ✅ Repasse líquido
- ☐ Calendário, ☐ Fotos

### Taxa de Gestão
- Input de percentagem (ex: 10%)
- Cálculo automático do valor e repasse líquido

### Preview PDF
- Painel lateral com preview em tempo real

### Envio
- Email do proprietário
- **WhatsApp** (diferencial BR) — botão "Enviar pelo WhatsApp"

### CTAs
- Pré-visualizar PDF / Baixar PDF / Enviar agora

---

## Interaction Flow Principal
```
Registo → Onboarding (≤15 min) → Dashboard (lucro real)
→ Registrar despesa → Gerar relatório → Enviar WhatsApp → Retido
```

---

## Componentes Novos Necessários
- `OnboardingWizard` (organism) — 4 passos com progresso
- `StatCard` (molecule) — métrica + variação + ícone
- `ReportBuilder` (organism) — configurador + preview PDF
- `WhatsAppShareButton` (atom) — link wa.me com mensagem pré-formatada
- `ExpenseList` (organism) — tabela de despesas com categorias

## Componentes Existentes a Reutilizar
- `PlanManagement` → padrão para configuração de relatório
- Calendário drag-drop → Próximas reservas
- PDF export → base para relatório proprietário
