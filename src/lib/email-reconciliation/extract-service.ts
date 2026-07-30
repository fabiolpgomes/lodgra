import OpenAI from 'openai'
import { EmailExtractionSchema, ExtractionResult } from './extraction.schema'
import { validateExtraction } from './validate-extraction'

let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

const EXTRACTION_PROMPT = `Extract reservation details from email. Return ONLY valid JSON.

JSON format:
{
  "guest_name": "guest full name",
  "check_in": "YYYY-MM-DD",
  "check_out": "YYYY-MM-DD",
  "number_of_guests": number (optional),
  "total_value": number (optional),
  "currency": "EUR|USD|GBP|etc" (optional),
  "reservation_code": "booking reference code" (optional),
  "property_name": "property/listing name (optional, but IMPORTANT - see rules)",
  "phone": "guest phone number" (optional)
}

EXAMPLES (few-shot):

Example 1:
Email: "Reserva confirmada - João Silva chega em 15 de agosto e sai em 20 de agosto. Property: Casa do Mar. Telefone: +351 912345678"
Output: {"guest_name":"João Silva","check_in":"2026-08-15","check_out":"2026-08-20","property_name":"Casa do Mar","phone":"+351 912345678"}

Example 2:
Email: "Booking.com - Nova reserva! Ana Santos, 1-7 julho 2026, €450 EUR. Contact: +1 2025551234. Unidade: Apartamento Vista Mar T2"
Output: {"guest_name":"Ana Santos","check_in":"2026-07-01","check_out":"2026-07-07","total_value":450,"currency":"EUR","phone":"+1 2025551234","property_name":"Apartamento Vista Mar T2"}

Example 3:
Email: "Lembrete: Nuno Soares chega quinta-feira (25 jul), sai terça (30 jul). Ref: BK12345. Alojamento: Villa Azul"
Output: {"guest_name":"Nuno Soares","check_in":"2026-07-25","check_out":"2026-07-30","reservation_code":"BK12345","property_name":"Villa Azul"}

Example 4 (no property mentioned - omit the field, don't guess):
Email: "Your booking is confirmed. Maria Costa, Aug 10-15."
Output: {"guest_name":"Maria Costa","check_in":"2026-08-10","check_out":"2026-08-15"}

RULES:
- Dates in Portuguese: "25 de julho" → "2026-07-25" (infer current/next year)
- If check-out missing but check-in present: try to infer from email context
- Extract phone numbers (any format: +351 912345678, (201) 555-1234, etc)
- property_name: this host manages MULTIPLE properties in the same account.
  When two bookings land on the exact same dates, property_name is the ONLY
  way to tell them apart downstream - look hard for it: subject line, listing
  title, "Property:", "Unidade:", "Alojamento:", "Listing:", address line, or
  any line naming the accommodation. Extract it exactly as written. If truly
  absent, omit the field - do NOT invent or guess a property name.
- Return ONLY the JSON object, NO markdown, NO extra text
- Required: guest_name, check_in, check_out
- For fields not found: omit them (don't include null)

Email to extract:
---
{{EMAIL_CONTENT}}
---

Return only JSON:`

export async function extractEmailData(rawContent: string, model: string = 'gpt-4o-mini'): Promise<ExtractionResult> {
  try {
    const prompt = EXTRACTION_PROMPT.replace('{{EMAIL_CONTENT}}', rawContent)

    const message = await getOpenAI().chat.completions.create({
      model,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = message.choices[0].message.content || ''

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        success: false,
        error: 'No JSON found in response',
        confidence: 0,
        raw_response: responseText,
      }
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate with Zod
    const validation = EmailExtractionSchema.safeParse(parsed)
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
        confidence: 0.3,
        raw_response: responseText,
      }
    }

    // Calculate confidence based on required fields presence
    const requiredFields = ['guest_name', 'check_in', 'check_out']
    const presentFields = requiredFields.filter((field) => validation.data[field as keyof typeof validation.data])
    const initialConfidence = presentFields.length / requiredFields.length

    // AC4: Phase 3 Deterministic Validation
    const deterministic = validateExtraction(
      {
        success: true,
        data: validation.data,
        confidence: initialConfidence,
        raw_response: responseText,
      },
      undefined // propertyHistoricalAdr optional for Phase 3
    )

    return {
      success: deterministic.valid,
      data: deterministic.valid ? validation.data : undefined,
      confidence: deterministic.confidence,
      raw_response: responseText,
      error: !deterministic.valid ? `Validation failed: ${deterministic.issues.map(i => i.message).join('; ')}` : undefined,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: errorMessage,
      confidence: 0,
    }
  }
}
