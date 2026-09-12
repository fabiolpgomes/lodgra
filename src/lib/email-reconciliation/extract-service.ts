import OpenAI from 'openai'
import {
  EMAIL_EXTRACTION_MAX_CONTENT_CHARS,
  EMAIL_EXTRACTION_VERSION,
  EmailExtractionPlatform,
  EmailExtractionSchema,
  ExtractionResult,
} from './extraction.schema'
import { validateExtraction } from './validate-extraction'

let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openaiClient
}

export const EXTRACTION_PROMPT_V1 = `Você extrai dados de um e-mail de confirmação de reserva da plataforma {{source_platform}}.

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
}`

const RESPONSE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['guest_name', 'check_in', 'check_out', 'total_value', 'currency', 'source_platform', 'property_identifier_raw', 'reservation_code', 'guest_count', 'confidence'],
  properties: {
    guest_name: { type: ['string', 'null'] },
    check_in: { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    check_out: { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    total_value: { type: ['number', 'null'], minimum: 0 },
    currency: { type: ['string', 'null'], pattern: '^[A-Z]{3}$' },
    source_platform: { type: 'string', enum: ['airbnb', 'booking', 'vrbo'] },
    property_identifier_raw: { type: ['string', 'null'] },
    reservation_code: { type: ['string', 'null'] },
    guest_count: { type: ['integer', 'null'], minimum: 1 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
} as const

export async function extractEmailData(
  rawContent: string,
  sourcePlatform: EmailExtractionPlatform,
  model = process.env.EMAIL_EXTRACTION_MODEL || 'gpt-4.1-mini'
): Promise<ExtractionResult> {
  const truncated = rawContent.length > EMAIL_EXTRACTION_MAX_CONTENT_CHARS
  const boundedContent = rawContent.slice(0, EMAIL_EXTRACTION_MAX_CONTENT_CHARS)

  try {
    const completion = await getOpenAI().chat.completions.create({
      model,
      max_tokens: 700,
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'email_reservation_extraction_v1', strict: true, schema: RESPONSE_SCHEMA },
      },
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT_V1.replaceAll('{{source_platform}}', sourcePlatform) },
        { role: 'user', content: `<email_data>\n${boundedContent}\n</email_data>` },
      ],
    })

    const responseText = completion.choices[0]?.message.content || ''
    const parsed = JSON.parse(responseText)
    const schemaResult = EmailExtractionSchema.safeParse(parsed)
    if (!schemaResult.success || schemaResult.data.source_platform !== sourcePlatform) {
      return {
        success: false,
        error: schemaResult.success
          ? 'source_platform differs from the trusted sender classification'
          : `Schema validation failed: ${schemaResult.error.message}`,
        confidence: 0, raw_response: responseText, model,
        version: EMAIL_EXTRACTION_VERSION, truncated,
      }
    }

    const deterministic = validateExtraction({
      success: true, data: schemaResult.data, confidence: schemaResult.data.confidence,
      raw_response: responseText, model, version: EMAIL_EXTRACTION_VERSION, truncated,
    })

    return {
      success: deterministic.valid,
      data: schemaResult.data,
      confidence: deterministic.confidence,
      error: deterministic.valid ? undefined : `Deterministic validation failed: ${deterministic.issues.map((issue) => issue.message).join('; ')}`,
      raw_response: responseText, model, version: EMAIL_EXTRACTION_VERSION, truncated,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown extraction error',
      confidence: 0, model, version: EMAIL_EXTRACTION_VERSION, truncated,
    }
  }
}
