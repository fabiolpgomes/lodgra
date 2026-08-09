import Anthropic from '@anthropic-ai/sdk'

export interface ParsedReservation {
  guest_name: string | null
  checkin_date: string | null   // YYYY-MM-DD
  checkout_date: string | null  // YYYY-MM-DD
  amount: number | null
  currency: string | null
  platform: 'airbnb' | 'booking' | 'flatio' | 'unknown'
  property_name: string | null
  confirmation_code: string | null
  num_guests: number | null
  discount_amount: number | null
}

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic()
  }
  return client
}

export async function parseReservationEmail(emailBody: string): Promise<ParsedReservation | null> {
  if (!emailBody || emailBody.trim().length < 20) return null

  const currentYear = new Date().getFullYear()
  const prompt = `Extraia os dados de confirmação de reserva COMO JSON puro, sem markdown.

Regras:
- Datas em português → YYYY-MM-DD (ex: "10 de set" → "${currentYear}-09-10")
- Use null para campos não encontrados
- Retorne APENAS JSON válido, uma única linha é OK
- Não coloque aspas extras ou comentários

Mapeie para este JSON:
{
  "guest_name": string or null,
  "checkin_date": "YYYY-MM-DD" or null,
  "checkout_date": "YYYY-MM-DD" or null,
  "amount": number or null,
  "currency": "EUR"|"BRL"|"USD"|"GBP"|null,
  "platform": "airbnb"|"booking"|"flatio"|"unknown",
  "property_name": string or null,
  "confirmation_code": string or null,
  "num_guests": number or null,
  "discount_amount": number or null
}

Email (primeiras 6000 caracteres):
${emailBody.slice(0, 6000)}`

  try {
    const message = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') return null

    const text = content.text.trim()
    // Extrair JSON mesmo que venha com markdown code block
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0]) as ParsedReservation

    // Fallback: tentar extrair datas com regex se Claude não conseguiu
    if (!parsed.checkin_date || !parsed.checkout_date) {
      try {
        const dates = extractDatesWithRegex(emailBody)
        if (!parsed.checkin_date && dates.checkin) {
          parsed.checkin_date = dates.checkin
        }
        if (!parsed.checkout_date && dates.checkout) {
          parsed.checkout_date = dates.checkout
        }
      } catch (regexErr) {
        console.error('[parser] Regex extraction failed:', regexErr instanceof Error ? regexErr.message : String(regexErr))
      }
    }

    return parsed
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[parser] Erro ao extrair dados com Claude:', msg)
    throw new Error(`Claude API error: ${msg}`)
  }
}

/**
 * Extrai datas em português do email usando regex
 * Procura padrões como "10 de set." ou "10 de setembro"
 */
function extractDatesWithRegex(emailBody: string): { checkin: string | null; checkout: string | null } {
  try {
    const meses: Record<string, string> = {
      'jan': '01', 'janeiro': '01',
      'fev': '02', 'fevereiro': '02',
      'mar': '03', 'março': '03',
      'abr': '04', 'abril': '04',
      'mai': '05', 'maio': '05',
      'jun': '06', 'junho': '06',
      'jul': '07', 'julho': '07',
      'ago': '08', 'agosto': '08',
      'set': '09', 'setembro': '09',
      'out': '10', 'outubro': '10',
      'nov': '11', 'novembro': '11',
      'dez': '12', 'dezembro': '12',
    }

    // Regex para encontrar datas como "10 de set." ou "10 de setembro"
    const dateRegex = /(\d{1,2})\s+de\s+([a-záçã]+)/gi
    const matches = [...emailBody.matchAll(dateRegex)]

    if (matches.length < 2) {
      return { checkin: null, checkout: null }
    }

    const currentYear = new Date().getFullYear()

    // Converter primeira e segunda datas encontradas
    const dates = matches.slice(0, 2).map((match) => {
      const day = match[1].padStart(2, '0')
      const monthStr = match[2].toLowerCase()
      const month = meses[monthStr]

      if (!month) return null

      // Se a data é no passado deste ano, usar próximo ano
      const testDate = new Date(`${currentYear}-${month}-${day}`)
      const year = testDate < new Date() ? currentYear + 1 : currentYear
      return `${year}-${month}-${day}`
    })

    return {
      checkin: dates[0] || null,
      checkout: dates[1] || null,
    }
  } catch (err) {
    console.error('[regex] Error during extraction:', err instanceof Error ? err.message : String(err))
    return { checkin: null, checkout: null }
  }
}
