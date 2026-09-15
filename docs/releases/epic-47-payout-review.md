# Épico 47 — candidato de contrato e cálculo de repasse

Documento sanitizado para revisão das Stories 47.1–47.5. Descreve o escopo do candidato; não constitui aprovação de publicação. A validação do conjunto isolado deve ser vinculada à base, ao manifesto de arquivos e aos hashes efetivamente revisados.

## Comportamento entregue

A propriedade passa a oferecer contrato de repasse versionado, histórico e preview mensal. A criação do primeiro contrato e a substituição de uma regra usam operações transacionais com controle de concorrência. Substituir encerra a vigência anterior e cria outra versão, preservando os campos históricos. Defaults preenchem novas versões; não reescrevem contratos existentes.

Um único motor calcula base, comissão de gestão, imposto da comissão e saldo do proprietário conforme a política efetiva. O contrato v2 configura competência, fluxo financeiro e tratamento dos componentes; o v1 mantém adaptação explícita. Valores monetários e rateios usam unidades mínimas com reconciliação determinística. Moedas divergentes e fatos insuficientes produzem problemas de qualidade de dados explícitos.

A edição de reserva oferece captura financeira detalhada ou base declarada. O modo declarado exige opt-in contratual, autoria, moeda, versão e confirmação explícita; o cálculo assistido apresenta sugestões que precisam ser confirmadas. Fatos desconhecidos continuam desconhecidos, sem preencher componentes por inferência. Snapshots substituídos permanecem disponíveis para auditoria. A proteção transacional impede que uma edição genérica sobrescreva silenciosamente um total gerido pelo snapshot declarado.

Para origens manuais e iCal compatíveis, a captura sincroniza seletivamente o total legado. A preservação dos demais campos e a compatibilidade dos leitores existentes fazem parte da revisão. A interface foi concebida para uso em larguras móveis de 375 e 390 px, com feedback de erro/sucesso, confirmação e navegação por teclado.

## APIs do candidato

Todas as rotas abaixo usam sessão autenticada, autorização por organização/propriedade, validação de payload e respostas de erro sanitizadas. Autoria e organização são resolvidas no servidor. As mutações exigem os papéis autorizados; controle de acesso também é aplicado no banco.

| Método e rota | Comportamento |
|---|---|
| `GET /api/properties/{propertyId}/payout-rules` | Consulta regra atual, histórico e contexto autorizado da propriedade. |
| `POST /api/properties/{propertyId}/payout-rules` | Cria o primeiro contrato v2 ou substitui a versão esperada; mantém compatibilidade do contrato anterior. |
| `POST /api/properties/{propertyId}/payout-rules/preview` | Calcula período explícito com regra persistida selecionada ou simulação; retorna resultado rastreável e qualidade dos dados. |
| `GET /api/reservations/{reservationId}/financial-facts` | Consulta snapshot atual, histórico e contexto da captura financeira. |
| `PUT /api/reservations/{reservationId}/financial-facts` | Registra nova versão de fatos por operação transacional, com validação do modo e concorrência. |

O preview persistido seleciona uma versão contratual explicitamente. Calcular um período anterior com essa versão não afirma vigência retroativa, não modifica fechamentos históricos e não efetua uma transferência. A fundação de alocações de recebimentos permite representar relações entre múltiplas reservas e recebimentos; ela não equivale a uma integração ativa com plataformas.

## Limites de entrega

- Migrações e ensaios de dados foram limitados ao staging. Aplicação em produção exige plano e aprovação separados.
- O candidato não efetua pagamentos, cobranças ou transferências. Extrato fechado, portal do proprietário e ingestão oficial de plataformas não são entregas deste conjunto.
- Evidência declarada conserva sua identificação e cobertura parcial da política de componentes. Não constitui reconciliação de plataformas nem prova de componentes detalhados ausentes.
- Não há importação de dados operacionais na publicação. Fontes, documentos de clientes, manifestos de execução, backups e credenciais ficam fora do candidato.
- A manutenção 47.5 atualiza Next.js para 16.3.5 e corrige dependências transitivas no manifesto/lock. Sua evidência local não substitui a instalação, auditoria e regressão do candidato financeiro isolado.
- Resultados históricos de QA pertencem aos conjuntos então testados. Não devem ser apresentados como PASS do conjunto isolado sem nova comprovação. Falhas de qualquer suite, inclusive de áreas preexistentes, precisam constar no resultado real; nenhum resumo de testes pode ocultá-las.

## Checklist antes de publicação

- [ ] Fixar base e conjunto exato de arquivos; conferir hashes após toda alteração e excluir mudanças alheias às stories.
- [ ] Confirmar que esta documentação e os demais arquivos selecionados não contêm dados de clientes, segredos, referências de ambientes privados ou caminhos locais.
- [ ] Validar instalação reproduzível e auditoria completa das dependências do conjunto isolado, preservando as opções de instalação explicitamente documentadas.
- [ ] Executar lint, typecheck, testes e build no conjunto isolado; registrar comandos, códigos de saída, totais e limitações reais. O lint padrão não comprova cobertura de TS/TSX.
- [ ] Resolver e registrar falhas do conjunto exato antes de emitir parecer; vincular CodeRabbit e QA aos hashes finais, com triagem de todos os achados aplicáveis.
- [ ] Conferir ordem e dependências de migrações, diferenças entre histórico local e staging, reversões e pré-condições de promoção. Não reaplicar capturas de validação.
- [ ] Concluir a revisão de DevOps do candidato isolado e apresentar branch/commit e ação de publicação concretos para autorização.
- [ ] Somente depois da autorização, executar as operações de publicação pela autoridade apropriada. Deploy e migrações de produção exigem seu próprio plano aprovado.

Até a conclusão desse checklist, este documento permanece material de revisão, sem declaração de GO para publicar.
