import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import fs from 'fs'
import path from 'path'

// Proteger com chave simples (configure em .env.local)
const IMPORT_SECRET = process.env.IMPORT_SECRET || 'dev-secret-key'

export async function POST(request: NextRequest) {
  try {
    // Validar chave
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${IMPORT_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()
    const orgId = '00000000-0000-0000-0000-000000000001'

    // Ler arquivo JSON local
    const filePath = path.join(process.cwd(), 'gmail-exporter', 'emails.json')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)

    const emails = data.emails
    let imported = 0
    let duplicates = 0
    let errors = 0

    for (const email of emails) {
      try {
        // Construir conteúdo raw
        const rawContent = `Subject: ${email.subject}\n\nFrom: ${email.from}\nTo: ${email.to}\nDate: ${email.date_header}\n\n${email.snippet || email.body || ''}`

        // Inserir em raw_emails
        const { error } = await supabase
          .from('raw_emails')
          .insert({
            organization_id: orgId,
            provider: 'gmail_import',
            provider_message_id: email.gmail_message_id,
            recipient: email.to,
            sender: email.from,
            subject: email.subject,
            received_at: email.received_at,
            raw_content: rawContent,
            processing_status: 'pending',
          })

        if (error) {
          if (error.code === '23505') {
            duplicates++
          } else {
            errors++
          }
        } else {
          imported++
        }
      } catch {
        errors++
      }
    }

    // Obter total de pendentes
    const { count } = await supabase
      .from('raw_emails')
      .select('*', { count: 'exact', head: true })
      .eq('processing_status', 'pending')
      .eq('organization_id', orgId)

    return NextResponse.json({
      success: true,
      imported,
      duplicates,
      errors,
      total_pending: count,
      next_step: 'POST /api/email-extraction/process-pending',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
