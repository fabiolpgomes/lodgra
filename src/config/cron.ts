// CRON_SECRET deve ser definida como variável de ambiente.
// Para gerar: openssl rand -base64 32
// Em produção (Vercel), configure CRON_SECRET nas environment variables.

export function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET
}
