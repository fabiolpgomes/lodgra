# Lodgra — Spec Consolidada de Evolução do Dashboard

**Fonte:** fusão de `lodgra-dashboard-melhorias-spec.md` (v1) + `lodgra-dashboard-v2-spec.md` (v2)
**Motivo da fusão:** os dois documentos cobrem ~60% do mesmo terreno (ADR/RevPAR, mix de canais, concentração de receita) com formulações levemente diferentes, e cada um tem itens exclusivos que o outro não cobre. Consumir os dois separadamente por um agente geraria retrabalho ou implementações divergentes da mesma métrica.

---

## 0. O que os dois documentos têm em comum (deduplicado aqui)

| Métrica | v1 (melhorias) | v2 | Fórmula única a usar |
|---|---|---|---|
| ADR | Seção 1 | 3.1 / 4.1 | `Receita do período / noites vendidas` |
| RevPAR | Seção 1 | 3.2 / 4.1 | `ADR × Taxa de Ocupação` (evita recalcular disponibilidade) |
| Mix de canais | Seção 2 | 3.6 / 4.3 | Agrupar por `canal`, % receita e % reservas |
| Concentração de receita | Seção 2 (por canal, limiar 60%) | 3.8 (por propriedade, limiar 40%) | **Ver conflito 1 abaixo — são duas métricas diferentes, não a mesma** |

**Conflito 1 — concentração não é uma métrica só:** v1 mede concentração *por canal de distribuição* (ex.: "68% vem do Airbnb"); v2 mede concentração *por propriedade* (ex.: "40% da receita vem de 1 imóvel"). São dois alertas distintos, ambos válidos, ambos devem ser implementados — apenas não confundir como se fossem a mesma feature com limiares diferentes (60% vs 40%). Manter os dois, com limiares configuráveis e independentes.

**Conflito 2 — posicionamento do ADR/RevPAR.** v1 pede dois cards separados de KPI (mesmo formato de "Propriedades"/"Reservas") logo após "Taxa de Ocupação". v2 pede um único card combinado ("ADR destaque + RevPAR secundário + badge MoM"). **Decisão recomendada:** um único card combinado (v2), pois evita inflar a primeira linha de KPIs para 5 cards e já nasce com o badge MoM que a v1 não previa.

---

## 1. Pré-requisitos de dados (só a v2 cobre isso — fazer primeiro)

Antes de qualquer UI, validar no Supabase:

- `canal` e `criada_em` populados em 100% das reservas (hoje há reservas sem preenchimento manual pós-sync iCal — [[lodgra]] já tem esse ponto como incômodo conhecido)
- Módulo Despesas vinculado a `property_id` + `data`
- Criar `monthly_property_metrics` (view materializada ou tabela) para MoM/YoY sem recálculo em tempo real
- Confirmar `cleaning_tasks.reservation_id` (necessário para o card "Hoje")
- **Novo campo de comissão na tabela de reservas** — hoje não existe. Adicionar `comissao_valor` (numérico, na mesma moeda da reserva) na própria tabela de reservas, não numa tabela de configuração por canal. Motivo: a comissão é calculada sobre o `valor_total` de cada reserva individual, e a taxa pode variar por plataforma e ao longo do tempo — armazenar só um "% por canal" fixo em outro lugar quebraria o histórico se a taxa mudar. Preenchimento: manual junto com nome/valor/hóspedes no fluxo atual pós-sync iCal, ou calculado automaticamente se/quando a taxa por canal virar configurável (ver ponto em aberto na seção 6)
- **Novo campo `desconto_valor`** na tabela de reservas — quando a reserva teve algum desconto aplicado
- **Novo campo(s) de taxa de serviço** na tabela de reservas — soma das taxas aplicáveis (ex.: Taxa de Limpeza, Taxa de Animais), cujos valores-base vêm cadastrados na tabela de propriedades (ex.: Taxa de Limpeza = 70, Taxa de Animais = 50) e são copiados/somados para a reserva no momento da criação, não recalculados dinamicamente depois — se o valor-base mudar na propriedade, reservas antigas mantêm o valor que tinham quando foram criadas

**Fórmula de valor final da reserva (nova):**
```
Valor Total Final = Valor Total da Reserva + Somatória das Taxas de Serviço − Comissão da Plataforma − Descontos
```

## 1.1 Conceitos de Receita — visão Gestor vs visão Proprietário (definição necessária antes da Fase 1)

Existem **três valores diferentes**, cada um servindo uma visão diferente do sistema. Não são a mesma "receita" com nomes diferentes — misturar qualquer um deles no lugar errado gera número errado tanto pro gestor quanto pro proprietário.

| Nível | Fórmula | Para quem | Onde é usado |
|---|---|---|---|
| **1. Receita Bruta** | `valor_total` da reserva (sem nenhuma dedução) | Gestor (visão operacional Lodgra) | ADR, RevPAR, Receita do Mês, Mix de Canais, Concentração — os cards operacionais do dashboard atual |
| **2. Faturamento da Propriedade** | `Valor Total Final = valor_total + Taxas de Serviço − Comissão da Plataforma − Descontos` | Proprietário do imóvel | Base da prestação de contas — é o "faturamento" que o proprietário enxerga, antes da comissão de gestão do Lodgra |
| **3. Repasse ao Proprietário** | `Faturamento da Propriedade − Comissão de Gestão do Lodgra (% cadastrado na propriedade) − Despesas da propriedade (se houver)` | Proprietário do imóvel | Valor final que efetivamente vai pro proprietário — o número que fecha a prestação de contas |
| **4. Lucro Real (do Lodgra)** | `Σ Comissão de Gestão de todas as propriedades no mês − Despesas da operação da empresa no mês` | Gestor (Lodgra) | Card "Lucro Real" do dashboard atual — é o espelho do nível 3 visto do lado da empresa: quanto a comissão de gestão somada rendeu, menos o custo de operar o negócio |

**Decisão confirmada por Fabio:** ADR/RevPAR e os demais cards operacionais do dashboard (visão do gestor) usam Receita Bruta (nível 1). A prestação de contas ao proprietário usa os níveis 2 e 3.

**Definição confirmada do card "Lucro Real":** a definição registrada anteriormente neste documento ("Receita − despesas do imóvel lançadas pela empresa") estava incompleta/desatualizada. A definição correta é:
```
Lucro Real = Σ (Comissão de Gestão de todas as propriedades no mês) − Despesas da operação da empresa no mês corrente
```
Ou seja, não é receita bruta de reserva menos despesa do imóvel — é a soma de tudo que o Lodgra fatura em comissão de gestão (nível 3, mas agregado do lado da empresa, não do proprietário) menos o custo operacional da empresa naquele mês. Isso é consistente com o nível 3 do modelo acima, só que visto do lado do gestor (quanto o Lodgra ganhou), não do proprietário (quanto sobrou pra ele).

**Campo de schema já existe:** confirmado — a tabela de propriedades já tem o campo "Percentual Gestão do Imóvel (%)" (visível na tela de cadastro/edição de propriedade, seção "Gestão"). Não precisa criar nada novo; o nível 3 e o nível 4 do modelo usam esse campo diretamente.

**Nota:** "prestação de contas" nas linhas acima é só o exemplo que Fabio usou para ilustrar quem consome cada nível de valor — não é um item de escopo definido nem uma tela planejada neste momento. O que importa reter é o modelo de 4 níveis em si (Bruto → Faturamento da Propriedade → Repasse ao Proprietário → Lucro Real do Lodgra), não a existência de um relatório específico.

**Regra:** métricas de canal/receita devem excluir ou sinalizar "dados incompletos" — nunca assumir zero para reserva sem `canal` ou `valor_total`.

---

## 2. Métricas — lista final (sem duplicar)

1. **ADR** — `receita / noites vendidas`, por propriedade e agregado
2. **RevPAR** — `ADR × ocupação`
3. **MoM / YoY** — para Receita, Lucro Real, Ocupação, ADR, RevPAR, Nº de reservas. Verde/vermelho padrão, **invertido em Despesas**
4. **Lead time médio** — `check_in - criada_em` das confirmadas
5. **Taxa de cancelamento** — `canceladas / total criadas no período` (funil histórico, diferente do donut de status atual)
6. **Mix de canais** — % receita e % reservas por canal + comissão (soma de `comissao_valor` das reservas do canal, não estimativa por taxa fixa)
7. **Concentração por canal** — alerta se 1 canal > 60% da receita
8. **Concentração por propriedade** — alerta se 1 imóvel > 40% da receita
9. **Ranking de propriedades** — por RevPAR, top 3 / bottom 3

---

## 3. Componentes de UI — lista final (sem duplicar)

| # | Componente | Substitui/complementa | Fonte |
|---|---|---|---|
| 1 | Card ADR/RevPAR combinado (com badge MoM) | Novo, ao lado de Taxa de Ocupação | v2 4.1 (decisão do conflito 2) |
| 2 | Badges MoM/YoY | Adiciona a Receita do Mês, Lucro Real, Taxa de Ocupação | v2 4.2 |
| 3 | Card "Receita por Canal" | Novo, abaixo de Receita Mensal | v2 4.3, absorve v1 seção 2. Comissão vem do novo campo `comissao_valor` por reserva, somada por canal — não é mais taxa estimada |
| 4 | Card "Ranking de Propriedades" | Novo | v2 4.4 |
| 5 | Painel "Alertas" | Substitui/expande Ações Rápidas | v2 4.5, absorve concentração de canal (v1) e de propriedade (v2). Ocupação baixa **não** entra aqui — vai pelo sino, ver nota abaixo |
| 6 | Card "Hoje" (check-ins/check-outs/limpeza/mensagens) | Precede Próximas Chegadas | v2 4.6, absorve parcialmente o Feed de Ações Pendentes da v1 (reservas sem hóspede preenchido cabe aqui ou no painel de Alertas — **decidir um lugar só**, não duplicar em ambos) |
| 7 | Card "Despesas do Mês" | Novo, espelha Receita do Mês | v2 4.7 |
| 8 | Indicador de status de sincronização | Colado abaixo do botão "Sincronizar" no cabeçalho | v1 seção 4 — **só a v1 cobre isso, manter**. Texto verde "Sincronizado às DD/MM HH:MM" quando OK; texto vermelho "Falha na sincronização às DD/MM HH:MM" quando erro |
| 9 | Ajuste visual "Lucro Real" sem despesas | Card existente | v1 seção 5 — **só a v1 cobre isso, manter**. A checagem "sem despesas lançadas no mês" passa a se referir a despesas da operação da empresa (nível 4), não despesas do imóvel — ver seção 1.1

**Nota sobre item 6:** v1 tinha um "Feed de Ações Pendentes" dedicado (reservas sem hóspede, falha de sync, pagamentos pendentes). v2 tem "Card Hoje" (operacional) + "Painel Alertas" (regras de negócio). Não recriar um terceiro bloco — a falha de sync vai para o Painel de Alertas (que já teria isso por natureza) e é resolvida junto do item 8.

**Decisão — reserva sem hóspede preenchido:** não cria bloco novo nem entra no Painel de Alertas. Reaproveitar o ícone de sino já existente no cabeçalho (visível no screenshot, ao lado do seletor de país): quando houver pendência, o sino fica vermelho; clique no sino abre a box já existente com o texto da mensagem/pendência. Reservas sem hóspede preenchido, falha de sync, pagamentos pendentes e ocupação baixa (ver abaixo) usam esse mesmo canal de notificação — não o Painel de Alertas da v2, nem um card à parte.

**Ocupação baixa também usa o sino:** quando alguma propriedade cair abaixo de **30%** de ocupação nos próximos 30 dias, o sino fica vermelho e a mensagem na box identifica **qual imóvel** está na situação (nome da propriedade, não só "ocupação baixa" genérico). Mesmo padrão das demais notificações: uma linha por pendência, com contexto suficiente para agir sem precisar navegar até achar o problema.

**Gatilho exato para reserva sem hóspede:** o sino fica vermelho quando, após a sincronização, o campo de nome do hóspede da reserva permanece com um valor placeholder — `hóspede` ou `Reserved` (visto em produção na listagem de Reservas) — em vez do nome real preenchido manualmente.

---

## 4. Ordem de implementação recomendada (fundida)

**Fase 1 — Fundação de dados + comparação temporal**
1. Validar/criar modelo de dados (seção 1 acima)
2. `monthly_property_metrics`
3. Badges MoM/YoY nos 3 cards existentes
4. Card ADR/RevPAR combinado

**Fase 2 — Granularidade e canais**
5. Card Receita por Canal (comissão somada do campo `comissao_valor` por reserva)
6. Card Ranking de Propriedades
7. Concentração de receita — por canal E por propriedade (dois alertas)

**Fase 3 — Operacional**
8. Indicador de status de sincronização (baixa complexidade, sem dependência — pode entrar em paralelo com qualquer fase)
9. Ajuste visual Lucro Real sem despesas (baixa complexidade, paralelo)
10. Card "Hoje"
11. Painel de Alertas (absorve: concentração por canal, concentração por propriedade, faturas de proprietários pendentes de pagamento)
12. Card Despesas do Mês

Itens 8 e 9 continuam podendo ser despachados a um agente separado em paralelo a qualquer fase, como já indicado na v1 — não têm dependência de dados nem de UI compartilhada.

---

## 5. Critérios de aceite consolidados

- [ ] Nenhum card novo quebra o grid existente em ≥1280px
- [ ] Todos os valores monetários respeitam o toggle EUR/BRL
- [ ] Reservas com `canal` ou `valor_total` ausentes são excluídas ou sinalizadas — nunca tratadas como zero
- [ ] Badges MoM/YoY mostram "—" quando não há período de comparação (nunca "0%")
- [ ] Filtro de propriedade no topo afeta todos os cards novos
- [ ] RevPAR = ADR × Ocupação validado por teste automatizado
- [ ] Concentração por canal (limiar 60%), por propriedade (limiar 40%) e ocupação baixa (limiar 30%) são alertas independentes, todos configuráveis, nenhum hardcoded
- [ ] Sino fica vermelho quando o nome do hóspede de alguma reserva sincronizada está com valor placeholder (`hóspede` ou `Reserved`) em vez do nome real, quando há falha de sync, pagamentos pendentes, ou alguma propriedade abaixo do limiar de ocupação nos próximos 30 dias; falha de sync e pagamentos pendentes usam o mesmo sino — não criar bloco/card separado para isso
- [ ] Alerta de ocupação baixa no sino identifica o imóvel específico (nome da propriedade), não uma mensagem genérica
- [ ] Indicador de sincronização abaixo do botão "Sincronizar" mostra texto verde + data/hora em caso de sucesso, texto vermelho + data/hora em caso de falha
- [ ] Design segue o `design.md` do dashboard atual (light mode, cards claros, ícone circular, conforme screenshot) — a identidade Lamborghini (`lodgra-design.md`: preto absoluto, Lodgra Gold, radius 0px) está descontinuada
- [ ] Migração adiciona `comissao_valor` na tabela de reservas; comissão por canal é somada desse campo, não calculada por taxa fixa estimada
- [ ] Migração adiciona `desconto_valor` e campo(s) de taxa de serviço na tabela de reservas, com valores-base de taxa vindos da tabela de propriedades e copiados no momento da criação da reserva (não recalculados retroativamente)
- [ ] ADR, RevPAR, Receita do Mês, Mix de Canais e Concentração usam Receita Bruta (`valor_total` da reserva, sem deduções) — visão do gestor. Faturamento da Propriedade e Repasse ao Proprietário (níveis 2/3) não entram nesses cards, ficam reservados para a futura Prestação de Contas
- [ ] Qualquer limiar ou taxa de comissão não definida aqui é perguntada ao Fabio antes de hardcode

---

## 6. Pontos em aberto para decisão do Fabio

Nenhum — todos os pontos foram resolvidos ao longo desta conversa. Limiar de ocupação baixa fixado em 30% (ver seção 3).

---

## 7. Guia de despacho para múltiplos agentes

Este documento é o que vai ser lido pelos agentes de implementação — a estrutura de fases (seção 4) já indica ordem, mas não indica explicitamente **quais itens conflitam se forem para agentes diferentes rodando ao mesmo tempo**. Isso importa: dois agentes editando o mesmo componente em paralelo geram merge conflict ou um sobrescreve o outro.

**Regra geral:** só despachar em paralelo itens que tocam componentes/arquivos distintos. A base é a coluna "Substitui/complementa" da tabela da seção 3.

**Conflito a evitar — mesmo agente ou sequencial, nunca paralelo:**
- Item 2 (Badges MoM/YoY) e item 9 (Ajuste visual Lucro Real sem despesas) **tocam o mesmo card "Lucro Real"**. Um agente adiciona o badge de variação, o outro altera a lógica de exibição do percentual — se forem dois agentes em paralelo, um dos dois PRs provavelmente vai sobrescrever o outro no mesmo componente. Mandar para o mesmo agente, ou um só depois do outro.

**Pré-requisito bloqueante para todo o resto:** seção 1 (schema — `comissao_valor`, `desconto_valor`, taxa de serviço, `monthly_property_metrics`) precisa estar pronta antes de qualquer agente tocar métricas de receita (itens 1, 2, 3, 7). Não despachar esses itens em paralelo com a seção 1 — eles dependem dela.

**Grupos seguros para rodar em paralelo (após a seção 1 concluída):**
- Grupo A: item 1 (ADR/RevPAR) + item 2 (Badges MoM/YoY) + item 9 (Lucro Real) — mesmo agente, por causa do conflito acima; todos tocam a primeira linha de KPIs
- Grupo B: item 3 (Receita por Canal) — independente, pode ir sozinho
- Grupo C: item 4 (Ranking de Propriedades) — independente, pode ir sozinho
- Grupo D: item 8 (Indicador de sync) — independente, sem dependência de dado, pode ir a qualquer momento, inclusive antes da seção 1
- Grupo E: item 6 (Card "Hoje") + item 5 (Painel de Alertas) — v2 já trata os dois como blocos operacionais próximos; melhor mesmo agente pra manter a lógica de "o que precisa de atenção hoje" coerente entre os dois, mas tecnicamente não conflitam se forem separados
- Grupo F: item 7 (Despesas do Mês) — independente, pode ir sozinho, mas depende da seção 1 (módulo Despesas vinculado a `property_id`)
