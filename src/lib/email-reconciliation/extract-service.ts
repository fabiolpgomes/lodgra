import OpenAI from 'openai'
import { EmailExtractionSchema, ExtractionResult } from './extraction.schema'
import { validateExtraction } from './validate-extraction'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
  "property_name": "property name" (optional)
}

EXAMPLES (few-shot):

Example 1:
Email: "Reserva confirmada - João Silva chega em 15 de agosto e sai em 20 de agosto. Property: Casa do Mar"
Output: {"guest_name":"João Silva","check_in":"2026-08-15","check_out":"2026-08-20","property_name":"Casa do Mar"}

Example 2:
Email: "Booking.com - Nova reserva! Ana Santos, 1-7 julho 2026, €450 EUR"
Output: {"guest_name":"Ana Santos","check_in":"2026-07-01","check_out":"2026-07-07","total_value":450,"currency":"EUR"}

Example 3:
Email: "Lembrete: Nuno Soares chega quinta-feira (25 jul), sai terça (30 jul). Ref: BK12345"
Output: {"guest_name":"Nuno Soares","check_in":"2026-07-25","check_out":"2026-07-30","reservation_code":"BK12345"}

RULES:
- Dates in Portuguese: "25 de julho" → "2026-07-25" (infer current/next year)
- If check-out missing but check-in present: try to infer from email context
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

    const message = await openai.messages.create({
      model,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

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
