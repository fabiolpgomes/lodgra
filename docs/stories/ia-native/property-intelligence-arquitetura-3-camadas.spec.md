# Especificação Prática: Property Intelligence em 3 Camadas

**Objetivo:** transformar o Property Intelligence de um motor baseado em benchmarks internos para um motor de decisão orientado por mercado, inteligência proprietária Lodgra/AHS e interpretação da IA.

**Estado atual:** existe um MVP CLI-first funcional com cenário curto/médio, cenário anual, comparáveis com `source`, `observedAt` e `marketTier`, relatório Markdown e JSON, e recomendação contextual.  
**Gap principal:** ainda não existe separação explícita e auditável entre as três camadas de decisão.

## 1. Problema a resolver

Hoje o relatório já apresenta dois cenários e comparáveis, mas a explicação de negócio ainda fica parcialmente embutida no cálculo.

O próximo salto de clareza é separar a análise em três camadas operacionais:

1. **Mercado** - o que o mercado observado consegue suportar.
2. **Inteligência Lodgra/AHS** - o que o histórico real da operação e a carteira administrada demonstram.
3. **IA** - a síntese final que cruza mercado, histórico e contexto do imóvel.

## 2. Princípios de produto

- Nenhuma camada deve apagar a anterior.
- A camada de IA nunca substitui os dados observados; ela apenas interpreta.
- O proprietário precisa ver o caminho entre bruto, custos, líquido e recomendação.
- Comparáveis de mercado devem ter fonte e data.
- Dados reais da Lodgra/AHS devem ter prioridade sobre benchmark genérico.
- O relatório precisa responder sempre a duas perguntas:
  - Quanto o mercado parece conseguir?
  - Quanto este ativo específico provavelmente consegue?

## 3. Arquitetura alvo

### 3.1 Camada 1 - Mercado

Função:
- captar comparáveis de curto/médio prazo e anual
- expor sinais de mercado recentes
- servir como base de range, não como verdade final

Entradas:
- localização
- tipologia
- área
- quartos
- estado
- mobilado
- amenities
- mercado geográfico
- comparáveis informados ou observados

Saídas:
- `marketSnapshot`
- `marketRange`
- `marketConfidence`
- lista de comparáveis com fonte, data, mercado e canal

Regras:
- marketSnapshot é o primeiro ponto de comparação
- short/mid usa fontes de OTA e portais de estadia
- annual usa portais de arrendamento
- comparáveis fora da zona principal podem existir, mas precisam ser marcados como secundários

### 3.2 Camada 2 - Inteligência Lodgra/AHS

Função:
- incorporar histórico real de operação da propriedade
- incorporar performance observada na carteira administrada
- dar peso superior a dados reais sobre benchmarks genéricos

Entradas:
- histórico de receita
- dias alugados
- ocupação histórica
- ADR histórica
- sazonalidade por mês
- custos operacionais reais
- mix de canais real
- manutenção / limpeza / gestão

Saídas:
- `lodgraSignal`
- `ownerRealityScore`
- `operationalWeighting`
- `historicalVsMarketDelta`

Regras:
- se existir histórico real do imóvel, ele sobrepõe o benchmark genérico
- se existir histórico de carteira comparável, ele supera comparáveis externos
- o sistema deve sempre conseguir dizer se o número final veio de mercado, de histórico real ou de ambos

### 3.3 Camada 3 - IA

Função:
- interpretar as duas camadas anteriores
- explicar qual cenário faz mais sentido
- produzir recomendação executiva

Entradas:
- marketSnapshot
- lodgraSignal
- contexto do proprietário
- estratégia do ativo
- premissas financeiras

Saídas:
- recomendação final
- razão da recomendação
- riscos e caveats
- narrativa executiva comercial

Regras:
- a IA não calcula fee nem custos básicos
- a IA não inventa comparáveis
- a IA não altera o resultado bruto calculado
- a IA escolhe o framing, não a matemática

## 4. Modelo financeiro alvo

### 4.1 Curta e média duração

Estrutura de cálculo:

`Receita bruta` → `custos de canal` → `receita após canais` → `custos operacionais` → `resultado líquido do proprietário`

Componentes possíveis:
- comissão OTA
- PMS / channel manager
- limpeza
- lavandaria
- utilities
- manutenção
- gestão

### 4.2 Locação anual

Estrutura de cálculo:

`Renda de mercado` → `custos de arrendamento / vacância / manutenção` → `resultado líquido do proprietário`

Componentes possíveis:
- renda mensal
- vacância estimada
- manutenção
- impostos / encargos se aplicável no modelo futuro

### 4.3 Níveis de líquido

O relatório deve distinguir claramente:

1. `grossRevenue`
2. `afterChannelRevenue`
3. `ownerNetReturn`

Regra:
- `monthlyNetReturn` existente hoje deve ser entendido como `ownerNetReturn` até o contrato ser expandido.
- se um comparável trouxer líquido observado, esse valor deve ser preservado.

## 5. Contratos de dados

### 5.1 Comparáveis

Cada comparável deve suportar:
- `label`
- `stayType`
- `marketTier`
- `monthlyGrossRevenue`
- `monthlyNetReturn?`
- `source`
- `observedAt`
- `note`

Campos adicionais recomendados para próxima iteração:
- `channelMix?`
- `occupancyPct?`
- `adr?`
- `seasonalityTag?`
- `isInternalBenchmark?`

### 5.2 Snapshot de mercado

Novo objeto sugerido:

```ts
marketSnapshot: {
  segment: 'short_mid' | 'annual'
  marketTier: 'coastal' | 'urban' | 'suburban' | 'rural'
  observedAt: string
  comparables: ComparableBenchmark[]
  medianGross: number
  medianNet: number
  confidence: 'low' | 'medium' | 'high'
}
```

### 5.3 Inteligência Lodgra/AHS

Novo objeto sugerido:

```ts
lodgraSignal: {
  historicalRevenue: number | null
  historicalOccupancyPct: number | null
  historicalAdr: number | null
  monthlySeasonality: Record<string, number> | null
  channelMix: Record<string, number> | null
  operationalCostsMonthly: number | null
  dataQuality: 'low' | 'medium' | 'high'
}
```

## 6. Lógica de precedência

Ordem de prioridade:

1. Dados reais da propriedade administrada
2. Dados reais comparáveis com source + observedAt
3. Benchmark derivado do motor Lodgra
4. Fallback determinístico do modelo atual

Regra de decisão:
- se o histórico real existir e for confiável, a IA deve usá-lo como âncora
- se o histórico real for parcial, a IA deve explicar o que foi inferido
- se só houver benchmark, o relatório precisa assumir explicitamente essa limitação

## 7. Mudanças necessárias no código

### 7.1 Engine

Adicionar a geração de um `analysisLayers` ou equivalente com:
- `market`
- `lodgra`
- `ai`

### 7.2 Cost model

Substituir a premissa fixa de comissão por:
- comissão por canal
- mix ponderado de canais
- fallback conservador quando o mix não existir

### 7.3 Strategy

Trocar recomendação baseada apenas em scoring sintético por:
- score financeiro
- score operacional
- score de flexibilidade do proprietário
- score de aderência ao mercado

### 7.4 Report

O relatório deve passar a exibir:
- bloco Mercado
- bloco Inteligência Lodgra/AHS
- bloco IA

Além disso:
- mostrar os três níveis de líquido
- deixar claro quando o valor veio de mercado, histórico ou inferência

## 8. Critérios de aceitação

- O relatório explica claramente as três camadas.
- O utilizador consegue distinguir mercado, histórico real e interpretação da IA.
- O cenário curto/médio e o anual continuam separados.
- O líquido deixa de parecer um número único sem contexto.
- O sistema preserva fontes e datas dos comparáveis.
- Se houver histórico real, ele tem peso superior ao benchmark genérico.
- O output final continua em JSON e Markdown.
- Os testes cobrem:
  - ordenação e recência dos comparáveis
  - precedência do histórico real
  - distinção entre líquido bruto, pós-canal e líquido do proprietário
  - renderização das três camadas no relatório

## 9. Fases de implementação

### Fase 1 - Estrutura de dados
- adicionar `marketSnapshot`
- adicionar `lodgraSignal`
- expandir comparáveis com campos opcionais de contexto operacional

### Fase 2 - Motor financeiro
- introduzir custo ponderado por canal
- separar líquido pós-canal de líquido do proprietário
- manter fallback conservador

### Fase 3 - Saída executiva
- reescrever o relatório em blocos Mercado / Lodgra / IA
- reforçar narrativa comercial
- destacar diferença anual vs curta/média duração

### Fase 4 - Aprendizado proprietário
- permitir que o histórico real da operação alimente a leitura futura
- registrar deltas entre mercado e operação real

## 10. Fora de escopo nesta iteração

- scraping automático
- integração direta com APIs de portais
- machine learning preditivo pesado
- painel web novo
- persistência obrigatória de longo prazo
- orquestração multiagente

## 11. Resultado esperado

Depois desta evolução, o Property Intelligence deixa de parecer apenas uma calculadora com benchmarks e passa a funcionar como um motor de decisão:

- mercado diz o que é possível
- Lodgra/AHS diz o que já aconteceu na prática
- IA diz qual leitura é a mais coerente para o imóvel e para o proprietário

