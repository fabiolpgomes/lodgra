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
}

const client = new Anthropic()

export async function parseReservationEmail(emailBody: string): Promise<ParsedReservation | null> {
  if (!emailBody || emailBody.trim().length < 20) return null

  const currentYear = new Date().getFullYear()
  const prompt = `Extrai do seguinte email de confirmação de reserva os dados em JSON válido.
IMPORTANTE - Estratégia de extração:
1. Extrai TODOS os dados que conseguires encontrar, mesmo que incompletos
2. Converte datas em português para YYYY-MM-DD (ex: "10 de set." = "${currentYear}-09-10")
3. Se um campo realmente não existir, retorna null
4. NÃO retorna null para TUDO só porque alguns campos faltam

Campos a extrair (extrai o que conseguires):
{
  "guest_name": "nome do hóspede" | null,
  "checkin_date": "YYYY-MM-DD" | null,
  "checkout_date": "YYYY-MM-DD" | null,
  "amount": número | null,
  "currency": "EUR" | "BRL" | "USD" | "GBP" | null,
  "platform": "airbnb" | "booking" | "flatio" | "unknown",
  "property_name": "descrição do imóvel" | null,
  "confirmation_code": "código" | null,
  "num_guests": número | null
}

Retorna APENAS o JSON válido, sem markdown, sem comentários, sem texto adicional.
IMPORTANTE: Mesmo que só encontres 1-2 campos, retorna-os! Não retornes todos null.

Campos a extrair:
{
  "guest_name": "nome completo do hóspede" | null,
  "checkin_date": "YYYY-MM-DD (data de entrada)" | null,
  "checkout_date": "YYYY-MM-DD (data de saída)" | null,
  "amount": número do valor da reserva | null,
  "currency": "EUR" | "BRL" | "GBP" | "USD" | null,
  "platform": "airbnb" | "booking" | "flatio" | "airbnb" | "unknown",
  "property_name": "nome ou descrição do imóvel" | null,
  "confirmation_code": "código de confirmação" | null,
  "num_guests": número total de hóspedes (adultos + crianças + bebés) | null
}

Email:
${emailBody.slice(0, 8000)}`

  try {
    const message = await client.messages.create({
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
