import { z } from 'zod'

// PostgreSQL's uuid type accepts every 128-bit hexadecimal UUID value. Zod's
// uuid() validator is intentionally narrower because it enforces RFC version
// and variant bits, which rejects valid database fixtures such as ...0001.
export const postgresUuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'UUID PostgreSQL inválido',
)
