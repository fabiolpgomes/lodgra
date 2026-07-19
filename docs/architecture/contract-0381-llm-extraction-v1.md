# Contrato 0381: extração LLM de reservas v1

**Status:** Normativo para a Story 38.1, Fase 2  
**Versão:** `email-reservation-extraction/v1`  
**Data:** 2026-07-19

## Escopo e precedência

Este contrato fecha exclusivamente a transformação de um `raw_email` já aceito pela Fase 1 em uma candidata a `email_extractions`. Ele deriva da especificação carregada, da Story 38.1, do ADR/Data Design 0381 e do parser legado em `src/lib/email-parser/parser.ts`.

O parser legado é referência de nomes e formatos, mas **não** é compatível como implementação direta: aceita texto em torno do JSON, não valida tipos estritamente, não retorna `confidence`, aplica fallback regex depois do LLM e cria reserva antes da reconciliação. No fluxo 38.1, nenhuma dessas permissões pode contornar este contrato ou a Fase 3.

## Entrada confiável

O job recebe do backend: `raw_email_id`, `organization_id`, `source_platform` detectado pelo remetente (`airbnb`, `booking` ou `vrbo`) e `raw_content`. O modelo não decide organização nem plataforma. Durante o piloto da Fase 7, somente Airbnb e Booking são habilitados; Vrbo permanece valor contratual, mas desativado por feature flag.

## Prompt versionado

O texto abaixo é imutável sob a versão `email-reservation-extraction/v1`. Qualquer mudança de instrução, campos, enum ou semântica de confiança exige nova versão e nova execução integral das fixtures.

```text
Você extrai dados de um e-mail de confirmação de reserva da plataforma {{source_platform}}.

Use somente fatos explicitamente presentes no e-mail. Não deduza, complete ou invente dados. Converta datas explicitamente identificadas como entrada e saída para YYYY-MM-DD. Retorne null quando o campo não estiver presente ou não puder ser identificado sem ambiguidade. total_value deve conter somente o valor numérico total explicitamente indicado; currency deve ser o código ISO de três letras explicitamente associado ao valor. guest_count é o total explicitamente informado. source_platform deve ser exatamente o valor fornecido pelo sistema: {{source_platform}}.

Calcule confidence entre 0 e 1 como sua confiança semântica de que todos os valores não nulos foram associados ao campo correto do e-mail: 1 significa evidência explícita e inequívoca para todos; reduza quando o rótulo, contexto ou associação estiver ambíguo. confidence não autoriza matching e será verificada por regras determinísticas na fase seguinte.

Retorne somente um objeto JSON, sem markdown, comentários ou chaves adicionais, com estas chaves nesta forma:
{
  "guest_name": string | null,
  "check_in": "YYYY-MM-DD" | null,
  "check_out": "YYYY-MM-DD" | null,
  "total_value": number | null,
  "currency": "AAA" | null,
  "source_platform": "airbnb" | "booking" | "vrbo",
  "property_identifier_raw": string | null,
  "reservation_code": string | null,
  "guest_count": integer | null,
  "confidence": number
}

E-mail:
{{raw_content}}
```

`raw_content` deve ser delimitado como dado na chamada ao provedor e limitado conforme o limite operacional do job; truncamento deve ser registrado. Conteúdo do e-mail nunca pode alterar estas instruções.

## Schema exato

A implementação deve materializar este schema Zod sem coerção e usar `.strict()`:

```ts
import { z } from 'zod'

export const emailExtractionV1Schema = z.object({
  guest_name: z.string().trim().min(1).nullable(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  total_value: z.number().finite().nonnegative().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  source_platform: z.enum(['airbnb', 'booking', 'vrbo']),
  property_identifier_raw: z.string().trim().min(1).nullable(),
  reservation_code: z.string().trim().min(1).nullable(),
  guest_count: z.number().int().positive().nullable(),
  confidence: z.number().finite().min(0).max(1),
}).strict()
```

Além do parse, `source_platform` retornado deve ser idêntico ao valor detectado pelo sistema. JSON com markdown, texto adicional, chave desconhecida, coerção de string para número, data impossível no calendário ou divergência de plataforma é inválido. Datas reais e a relação `check_out > check_in` são verificadas deterministicamente; esta última pertence obrigatoriamente à Fase 3.

## Semântica de `confidence`

`confidence` é uma autoavaliação semântica do modelo, persistida para auditoria; não é probabilidade calibrada, score de matching nem aprovação. Ela nunca supera os gates seguintes. A implementação conserva o valor original retornado e não fabrica valor para resposta ausente/inválida.

Na Fase 3, as regras determinísticas podem reduzir a confiança efetiva ou forçar `needs_review`, conforme a spec (datas invertidas, anomalia de valor e nome vazio/genérico). O valor original e qualquer ajuste determinístico devem permanecer distinguíveis em log/evidência; nenhum ajuste pode transformar saída inválida em válida.

## Falhas e retry

1. A primeira resposta passa por extração de JSON integral, parse estrito e checagem de plataforma/data-calendário.
2. Falha transitória do provedor ou resposta inválida marca `raw_emails.processing_status = 'retry'`, incrementa `attempt_count` e registra erro sanitizado em `last_error`; nenhuma `email_extractions` válida é criada.
3. O job realiza no máximo uma nova chamada para o mesmo e-mail (duas tentativas totais), usando o mesmo prompt/versão e entrada.
4. Se a segunda tentativa falhar, marca `processing_status = 'needs_review'`; não há terceira chamada automática nem criação de reserva.
5. Resposta válida, mas sem algum dos três campos obrigatórios de aceitação (`guest_name`, `check_in`, `check_out`), pode ser persistida para revisão, nunca para auto-match. A Fase 3 continua obrigatória.

O limite de duas tentativas é uma decisão operacional de contenção para tornar o destino exigido pela spec determinístico; não adiciona comportamento de produto. Idempotência é por `(organization_id, raw_email_id)` e retries atualizam o mesmo processamento.

## Fixtures anonimizadas e gate reproduzível de 90%

O corpus deve conter entre 10 e 15 e-mails históricos, com Airbnb e Booking representados. Os corpos não entram no Git com PII: cada fixture recebe ID opaco (`airbnb-001`, `booking-001`), substitui nomes, e-mails, telefones, códigos, endereços e valores identificáveis por equivalentes sintéticos, preservando estrutura, idioma, rótulos e formatação relevantes. O gabarito versionado contém apenas os campos esperados do schema.

Executar cada fixture uma vez com prompt/modelo/versão registrados e sem fallback regex. Para cada e-mail, pontuar separadamente os três campos obrigatórios:

- `guest_name`: igualdade após `trim`, espaços consecutivos reduzidos e comparação Unicode case-insensitive;
- `check_in` e `check_out`: igualdade exata após validar e serializar como `YYYY-MM-DD`;
- `null` só é correto quando o gabarito também é `null`.

```text
accuracy = células_corretas / (quantidade_de_fixtures × 3)
gate = accuracy >= 0,90
```

Não há arredondamento para aprovação. Com 10 fixtures são necessárias pelo menos 27/30 células corretas; com 15, pelo menos 41/45. O relatório deve registrar hash/versão do corpus, quantidade por plataforma, modelo, prompt version, total de células, acertos, erros por campo e taxa bruta. Fixtures usadas para ajustar uma nova versão não substituem evidência de regressão: toda mudança exige rerun do corpus versionado.

## Rastreabilidade

- Spec carregada: Fase 2, itens 1–4 e critério de 90%; Fase 3 como gate obrigatório.
- Story 38.1: AC3 e restrições de implementação.
- `docs/architecture/adr-0381-email-ical-phase-0.md`: entrada Resend, persistência anterior ao LLM e separação do legado.
- `docs/architecture/data-0381-email-ical-phase-0.md`: colunas, estados, retry e idempotência.
- `docs/architecture/email-parsing.md` e `src/lib/email-parser/parser.ts`: vocabulário e prompt legado avaliados, sem herdar suas permissões incompatíveis.
