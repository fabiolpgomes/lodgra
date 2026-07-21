# Lodgra 2.0 — Avaliação da proposta AI-First / AI-Native

**Documento analisado:** `docs/stories/AI-Execution-Protocol.md`  
**Data da avaliação:** 2026-07-20  
**Escopo desta etapa:** análise e recomendação; nenhuma implementação autorizada  
**Decisão:** **NO-GO para construir a plataforma a partir do protocolo v1. GO para produzir o protocolo v2 e executar uma Fase 0 de alinhamento, seguida de discovery e concierge instrumentado.**

## 1. Resumo executivo

A tese central faz sentido: posicionar a Lodgra como uma camada de inteligência operacional integrada aos PMS existentes é potencialmente mais defensável do que criar outro PMS generalista. O protocolo também acerta ao exigir validação comercial antes de software, valor mensurável e foco em problemas operacionais reais.

Entretanto, a versão 1.0 ainda é um protocolo de descoberta em alto nível, não um plano executável e tampouco uma arquitetura AI-native. Ela tenta validar uma plataforma ampla antes de escolher um ICP, um comprador e uma decisão operacional específica. Também deixa pricing para o fim, duplica entrevistas entre agentes, não define gates quantitativos e omite dados, LGPD, segurança, avaliação de IA, human-in-the-loop, economia unitária e governança de modelos.

O passo correto não é desenvolver a Lodgra 2.0 agora. É provar, dentro de um segmento homogêneo, **quem paga por qual decisão operacional, com quais dados, por qual resultado e a que custo de entrega**.

## 2. O que faz sentido na proposta

1. **Complementar o PMS:** manter PMS/channel manager como sistema de registro e usar a Lodgra como camada de inteligência reduz escopo e custo de substituição.
2. **Problema antes da funcionalidade:** evita competir por paridade de features.
3. **Venda antes da construção:** pilotos pagos são evidência mais forte do que interesse declarado.
4. **Concierge MVP:** permite aprender manualmente o workflow que depois poderá ser parcialmente automatizado.
5. **Valor econômico explícito:** reduzir custos, aumentar receita ou poupar tempo cria uma base objetiva de priorização.
6. **Dependências gerais coerentes:** pesquisa → priorização → concierge → produto é uma direção correta, embora os gates precisem ser refeitos.

## 3. Por que a versão 1.0 não deve comandar a implementação

### 3.1 Estratégia e mercado

- “Gestores de aluguel por temporada” não é um ICP: mistura proprietários, co-hosts, administradoras e operações hoteleiras com orçamento, dados e processos diferentes.
- A proposta tenta cobrir recomendações operacionais, finanças, manutenção preditiva, limpeza, relatórios ao proprietário, revenue management e briefing diário. Isso impede atribuir valor a uma única solução.
- O posicionamento “resolver o que PMS não resolve” é instável: PMS, ferramentas de pricing e operações já adicionam recursos de IA.
- O protocolo não define mercado alcançável bottom-up, comprador, usuário, bloqueador técnico, ciclo de venda ou unidade de cobrança.
- Agents A e C duplicam 20–30 entrevistas sem separar pesquisa de mercado de customer discovery.
- Agent I testa pricing tarde demais. Oferta, preço e compromisso devem ser testados durante discovery e antes da arquitetura.

### 3.2 Produto e métricas

- As métricas não possuem baseline, meta, janela, fonte, responsável nem regra de atribuição.
- “Cinco prospects interessados” é fraco; devem ser cinco pilotos pagos dentro do mesmo segmento e para o mesmo problema.
- “Continuar pagando após o primeiro mês” não define denominador, taxa de retenção, margem, custo do concierge ou razão de churn.
- Não existem critérios Go/Kill/Pivot, non-goals ou definição de qual evidência invalida cada hipótese.
- O documento não contém FRs, NFRs e constraints rastreáveis.

### 3.3 Dados, IA e arquitetura

- A IA aparece como uma lista de capacidades, não como um ciclo operacional de percepção, decisão, aprovação, execução, resultado e aprendizagem.
- Não há PMS piloto, contrato de integração, modelo de dados canônico, identidade entre fontes, proveniência, reconciliação ou modo degradado.
- Não há separação entre regras determinísticas, inferência probabilística e ações executáveis.
- Não existem dataset de avaliação, métricas de groundedness/factualidade, falsos positivos, abstenção, regressão ou vazamento entre tenants.
- Não há classificação de risco, aprovação humana, rollback ou responsabilidade por recomendações erradas.
- Predictive maintenance e análise de limpeza pressupõem históricos, labels, imagens ou sensores cuja existência não foi validada.

### 3.4 LGPD, segurança e governança

- Faltam papéis de controlador/operador, base legal, finalidade, minimização, retenção, exclusão, atendimento aos titulares e suboperadores.
- Mensagens de hóspedes, reservas e documentos podem conter dados pessoais e também prompt injection.
- Faltam isolamento multi-tenant, RBAC, criptografia, gestão de segredos, redaction de PII e trilha de auditoria.
- Para loops automatizados, não estão definidos teto de orçamento, story binding, scan de intent/injection, autoridade de routing ou hard stop, exigidos pelo Artigo XII da Constitution.

### 3.5 Execução AIOX

- O arquivo está em `ahs-website`, mas propõe um produto Lodgra para o Brasil; o repositório, produto e owner precisam ser reconciliados antes de qualquer código.
- Não é uma story executável: faltam status, owner, acceptance criteria completos, tasks/checklist, File List e QA gate.
- Autoridades exclusivas não estão registradas: arquitetura por `@architect`, verdict de qualidade por `@qa`, stories por `@sm/@po`, push/PR/release por `@devops`.
- CLI-first, observabilidade, testes, CI/CD, ambientes e rollback ainda não fazem parte do protocolo.

## 4. O que significa AI-native para a Lodgra

AI-first significa priorizar IA na proposta de valor. AI-native exige que o produto seja desenhado ao redor de um ciclo auditável de decisão:

```text
PMS/canais/fontes autorizadas
        ↓
Ingestão, normalização e reconciliação
        ↓
Operational Store canônico + proveniência
        ↓
Contexto, regras e restrições do negócio
        ↓
Raciocínio de IA grounded nos dados
        ↓
Recomendação + confiança + evidências
        ↓
Política de risco + aprovação humana
        ↓
Execução autorizada e reversível
        ↓
Resultado + feedback + avaliação contínua
```

Cada recomendação deve registrar fontes e snapshot dos dados, regras, versão do modelo/prompt, ferramentas, output, confiança, custo, latência, decisão humana, ação e resultado. Sem isso, há apenas uma funcionalidade de IA, não uma plataforma AI-native confiável.

## 5. Hipótese de beachhead a validar — não é requisito aprovado

Uma hipótese inicial plausível é atender administradoras profissionais com cerca de 20–100 unidades, operação multicanal, PMS implantado, equipe ou fornecedores recorrentes e um decisor responsável pela margem operacional.

Essa faixa deve ser validada, não assumida. A amostra deve ser estratificada por número de unidades, modelo operacional, destino/sazonalidade, maturidade tecnológica e papel do entrevistado. Resultados de segmentos diferentes não devem ser somados numa única lista de dores.

O primeiro produto não deve ser “uma plataforma”. Deve ser uma decisão recorrente e mensurável, por exemplo: detecção de exceções operacionais, briefing diário priorizado, manutenção, ou relatório acionável ao proprietário. A escolha só ocorrerá após evidência.

## 6. Protocolo v2 recomendado

O protocolo reescrito deve conter:

1. Contexto, decisão de produto, mercado e repositório-alvo.
2. ICP, comprador, usuário, JTBD e cadeia de decisão.
3. Hipóteses `H-*`, evidências aceitas e condição de invalidação.
4. Escopo, non-goals e uma decisão operacional prioritária.
5. Modelo de negócio, pricing, packaging e unit economics.
6. Dicionário de métricas: baseline, target, janela, fonte, owner e atribuição.
7. Requisitos `FR-*`, `NFR-*` e `CON-*` rastreáveis.
8. Contrato de cada agente: input, atividade, output, schema, AC e autoridade.
9. DAG de dependências e gates Go/Kill/Pivot.
10. Protocolo de pesquisa, amostra, consentimento e evidência anonimizada.
11. Concierge MVP pago, instrumentado e com custo humano medido.
12. Gate de dados e integração antes da arquitetura de produto.
13. Arquitetura de decisão, HITL, observabilidade, evals, LGPD e segurança.
14. Model governance conforme Artigo XII.
15. Riscos, mitigação, incidentes e rollback.
16. Plano de epics/stories, QA, CI/CD, ambientes e Definition of Done.

## 7. Sequência e gates recomendados

### G0 — Alinhamento

Confirmar owner, repositório-alvo, orçamento de discovery, mercado Brasil, hipótese de ICP, papéis e limites de autoridade.

**Saída:** protocolo v2 aprovado.  
**Kill:** produto/repositório sem owner ou orçamento; escopo continua sendo “plataforma para todos”.

### G1 — Discovery segmentado

Realizar 20 entrevistas totais, não duplicadas, dentro de segmentos declarados. Registrar ocorrências recentes, frequência, custo, workaround, consequência, comprador, orçamento e acesso a dados.

**Go:** saturação de uma dor em um segmento homogêneo, perda mensurável, comprador identificado e dados potencialmente acessíveis.  
**Pivot/Kill:** opiniões genéricas, baixa frequência, ausência de orçamento ou dados inacessíveis.

### G2 — Validação comercial

Testar oferta, preço, termos e onboarding durante discovery.

**Go:** pelo menos cinco pilotos pagos do mesmo ICP para o mesmo problema, com contrato/termos, responsável, data e acesso autorizado a dados.  
**Não conta:** “tenho interesse”, carta sem compromisso ou pilotos gratuitos.

### G3 — Concierge instrumentado

Executar manualmente a solução com baseline de 4–8 semanas e medir horas por unidade, incidentes por estadia, tempo de resolução, noites indisponíveis, margem, adoção/override, valor por recomendação e custo humano.

**Go:** outcome predefinido e repetível, retenção definida e unit economics com caminho plausível para margem positiva.  
**Pivot/Kill:** valor sem atribuição, operação artesanal não escalável ou ausência de retenção.

### G4 — Data/integration readiness

Selecionar um PMS e um tenant piloto; validar direitos de uso, API/export, qualidade, frequência, reconciliação, modelo canônico, LGPD e segurança.

**Go:** contrato de dados estável, DPIA/LIA quando aplicável, isolamento e dataset de avaliação aprovados.  
**Kill:** integração ou tratamento de dados inviáveis.

### G5 — Build em shadow mode

Construir via CLI primeiro. A IA recomenda sem executar; comparar com decisões e outcomes humanos.

**Go:** métricas técnicas e de negócio atingidas, custo máximo respeitado, trilha auditável e ausência de falhas críticas.  
**Pivot/Kill:** baixa groundedness, excesso de falsos positivos, vazamento, custo ou latência inviáveis.

### G6 — Advisory production

Disponibilizar recomendações reais com evidências, confiança, aprovação humana, observabilidade e suporte.

**Go:** adoção, confiança, impacto e SLOs sustentados em múltiplos ciclos.

### G7 — Automação restrita e escala

Automatizar apenas ações reversíveis e de baixo risco com performance comprovada. Pagamentos, reembolsos, cancelamentos, decisões legais ou alterações de alto impacto exigem aprovação reforçada.

## 8. Métricas mínimas

### Negócio

- Conversão entrevista → piloto pago.
- Receita e margem bruta por conta/unidade.
- Custo humano e de IA por recomendação/tenant.
- Retenção, churn e motivo de churn.
- CAC, payback e tempo até valor.

### Operação

- Horas operacionais por unidade.
- Incidentes por estadia e tempo de resolução.
- Noites indisponíveis por falha operacional.
- Adoção, edição e override das recomendações.
- Valor realizado por recomendação.

### IA e plataforma

- Groundedness/factualidade.
- Precisão, recall e falsos positivos dos alertas.
- Taxa de abstenção e escalonamento humano.
- Latência, frescor, disponibilidade e custo.
- Regressões por modelo/prompt e incidentes de segurança.
- Vazamento entre tenants: tolerância zero.

### Experiência e confiança

- Recomendação vista, compreendida, decidida, executada e avaliada são eventos distintos.
- Fonte e frescor dos dados visíveis em 100% das recomendações.
- Pelo menos 80% dos usuários-piloto explicam sem ajuda por que a recomendação foi gerada.
- Pelo menos 60% das recomendações vistas recebem decisão explícita.
- Decisão sobre uma prioridade deve levar menos de dois minutos no fluxo-alvo.
- Fato, inferência e previsão devem ser apresentados separadamente; falta de dados gera abstenção.
- Fluxos essenciais devem mirar WCAG 2.2 AA, uso mobile e linguagem brasileira clara.

## 9. Contrato mínimo de dados antes do primeiro piloto

Mesmo o concierge manual deve capturar uma cadeia reutilizável: `tenant → fonte → snapshot → recomendação → decisão humana → ação → outcome`.

O modelo canônico inicial deve prever tenant, usuário/função, propriedade/unidade, conexão PMS, mapeamento de IDs externos, reserva, hóspede com PII separada, tarifa/disponibilidade, tarefa, incidente, despesa, recomendação, evidência, decisão humana, ação, outcome e model run.

Requisitos bloqueadores:

- `tenant_id`, origem, timestamps e estado de qualidade em todo dado operacional;
- isolamento em banco, API, jobs, cache, embeddings, analytics, logs e exports;
- testes negativos cross-tenant com resultado sempre vazio;
- ingestão raw auditável, validação/quarentena e transformação para o modelo canônico;
- idempotência, deduplicação, retries, reconciliação, replay e dead-letter;
- snapshot reproduzível de cada recomendação;
- PII fora de logs, prompts e ambientes de desenvolvimento;
- retenção, correção, exportação e exclusão propagadas a caches e derivados;
- dados sintéticos em desenvolvimento e autorização específica para treino/eval.

## 10. Experiência mínima da recomendação

O valor não é “a IA recomendar”; é o gestor entender, confiar, agir e comprovar o resultado. Cada recomendação deve mostrar:

1. decisão proposta, urgência, prazo e responsável;
2. propriedade/processo afetado;
3. evidência, fonte e atualização;
4. fato observado, hipótese e limitações;
5. impacto esperado como faixa, nunca falsa certeza;
6. confiança e alternativas;
7. ações de aprovar, editar, rejeitar ou adiar;
8. estado de execução e outcome posterior.

O concierge deve entregar inicialmente no canal já usado pelo cliente, limitar o briefing a 3–5 exceções e registrar motivos de rejeição. Antes de UI, deve haver observação contextual de turnos reais de operação e teste do ciclo completo: `exceção → explicação → decisão → execução → resultado`.

## 11. Sequência técnica de implantação futura

Quando os gates comerciais e de dados forem satisfeitos, a implantação deve seguir:

1. **CLI de dados:** ingestão, validação, anonimização e exportação com fixtures sintéticas.
2. **Integration spike:** um PMS e um tenant, inicialmente somente leitura.
3. **Baseline determinístico:** regras mensuráveis antes de introduzir LLM.
4. **Motor offline:** recomendação grounded com provenance, confiança e aprovação humana.
5. **Shadow mode:** recomendações sem execução, comparadas às decisões humanas.
6. **Piloto isolado:** observabilidade, custo, suporte e rollback testados.
7. **Advisory production:** uso real com HITL e SLOs.
8. **Automação restrita:** somente ações reversíveis e de baixo risco.
9. **Multi-tenant e escala:** auth, RBAC, billing, onboarding e novos conectores apenas por evidência.

Ambientes: `local sintético → CI efêmero → preview sem dados reais → staging anonimizado/sandbox → pilot-prod isolado → produção gradual`.

CI/CD mínimo: lint, typecheck, unit, contract, security/secret scan, build, evals, preview, QA, migration dry-run, canary/rolling release, health gate e rollback. Produção, push, PR e release permanecem sob autoridade exclusiva de `@devops`.

## 12. Matriz inicial de autoridade para a implantação futura

| Etapa | Agente líder | Revisores/apoio | Autoridade final |
|---|---|---|---|
| Pesquisa de mercado | `@analyst` | `@pm` | `@pm` sobre recomendação de produto |
| ICP, oferta e roadmap | `@pm` | `@analyst`, `@po` | `@pm` |
| Backlog e acceptance criteria | `@po` / `@sm` | `@pm`, `@architect` | `@po` |
| Arquitetura e políticas técnicas | `@architect` | `@data-engineer`, `@devops`, `@qa` | `@architect` |
| Dados e LGPD técnico | `@data-engineer` | jurídico/DPO humano, `@architect` | owner humano + `@architect` no desenho técnico |
| Experiência e confiança | `@ux-design-expert` | `@pm`, usuários-piloto | `@pm` |
| Implementação | `@dev` | `@architect`, `@qa` | story aprovada |
| Qualidade | `@qa` | `@dev` | `@qa` |
| CI/CD, routing, push e release | `@devops` | `@architect`, `@qa` | `@devops` |
| Orquestração | `@aiox-master` | todos | respeita as autoridades acima |

## 13. Riscos que devem permanecer visíveis

1. PMSs incorporarem rapidamente a funcionalidade validada.
2. APIs/políticas mudarem ou dados chegarem incompletos.
3. Early adopters tecnológicos não representarem o mercado.
4. Sazonalidade dificultar atribuição de receita.
5. Concierge esconder custo humano incompatível com SaaS.
6. Recomendações erradas gerarem perda, discriminação ou quebra de confiança.
7. Dados pessoais cruzarem tenants ou fronteiras sem base adequada.
8. Dependência excessiva de um modelo, PMS ou canal.
9. Automação prematura de ações irreversíveis.
10. Regulação nacional, municipal ou condominial evoluir.

## 14. Referências iniciais que precisam ser aprofundadas na Fase 0/1

- [IBGE — módulo Turismo da PNAD Contínua 2024](https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/17270-pnad-continua.html?edicao=44609): evidencia uso de imóveis por temporada, mas não disposição dos gestores em pagar pela solução.
- [Ministério do Turismo — subcâmara sobre plataformas de aluguel por temporada](https://www.gov.br/turismo/pt-br/publicacoes/atos-normativos-2/2025/resolucao-caleg-cnt-mtur-no-1-de-14-de-maio-de-2025): sinaliza contexto regulatório em evolução.
- [Stays](https://stays.net/) e [integração de revenue management](https://stays.net/blog/sistema-de-revenue-management/): exemplos de expansão dos PMSs sobre operações e inteligência.
- [Cloudbeds AI Autopilot](https://myfrontdesk.cloudbeds.com/hc/pt-br/articles/47613232731291-Como-usar-o-recurso-do-AI-Autopilot): exemplo de IA incorporada por plataforma existente.

Essas fontes são insumos iniciais, não validação do produto Lodgra. A validação decisiva virá de comportamento, pagamento, dados autorizados e outcomes medidos.

## 15. Recomendação final

**Faz sentido perseguir a tese, mas não faz sentido implementar a plataforma com base no documento atual.**

A Lodgra 2.0 deve começar como um serviço de decisão operacional pago, estreito e instrumentado. Só deve evoluir para software AI-native depois de demonstrar que:

1. um ICP específico sofre uma dor recorrente e economicamente relevante;
2. existe comprador com orçamento e cinco pilotos pagos comparáveis;
3. os dados necessários são acessíveis, legais e confiáveis;
4. o concierge produz resultado repetível com atribuição razoável;
5. a IA supera um baseline em shadow mode com segurança, confiança e custo aceitável;
6. a automação proposta é reversível e proporcional ao risco.

O próximo artefato deve ser o **AI Execution Protocol v2**, seguido de uma story de Fase 0. A implementação de produto só poderá ser orquestrada após os gates G0–G4.
