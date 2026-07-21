import OpenAI from 'openai'
import { EmailExtractionSchema, ExtractionResult } from './extraction.schema'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const EXTRACTION_PROMPT = `Extract reservation details from the following email. Return ONLY valid JSON matching this structure:
{
  "guest_name": "guest full name",
  "check_in": "YYYY-MM-DD",
  "check_out": "YYYY-MM-DD",
  "number_of_guests": number,
  "total_value": number,
  "currency": "EUR|USD|GBP|etc",
  "reservation_code": "booking reference code",
  "property_name": "property name if mentioned"
}

Rules:
- Date format MUST be YYYY-MM-DD (extract and convert if needed)
- guest_name, check_in, check_out are REQUIRED
- Return ONLY the JSON object, no markdown or extra text
- If a field is missing, omit it (except required ones)

Email content:
---
{{EMAIL_CONTENT}}
---`

export async function extractEmailData(rawContent: string): Promise<ExtractionResult> {
  try {
    const prompt = EXTRACTION_PROMPT.replace('{{EMAIL_CONTENT}}', rawContent)

    const message = await openai.messages.create({
      model: 'gpt-5-nano',
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
    const confidence = presentFields.length / requiredFields.length

    return {
      success: true,
      data: validation.data,
      confidence,
      raw_response: responseText,
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
