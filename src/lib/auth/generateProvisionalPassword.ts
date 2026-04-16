/**
 * Generate a secure provisional password
 * Format: TempPass{Year}!{RandomAlphanumeric}
 * Example: TempPass2026!A1b2C3d4E5f6
 */
export function generateProvisionalPassword(): string {
  const year = new Date().getFullYear()

  // Generate 12 random characters (alphanumeric)
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let randomChars = ''
  for (let i = 0; i < 12; i++) {
    randomChars += charset.charAt(Math.floor(Math.random() * charset.length))
  }

  return `TempPass${year}!${randomChars}`
}
