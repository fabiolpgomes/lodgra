import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyUnsubscribeToken } from '@/lib/email/security'

function htmlResponse(title: string, message: string, status: number) {
  const html = `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px; background: #f8fafc; color: #0f172a; }
      .card { max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      h1 { margin: 0 0 12px; font-size: 28px; }
      p { margin: 0; line-height: 1.6; color: #334155; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      <p>${message}</p>
    </div>
  </body>
</html>`

  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return htmlResponse('Token em falta', 'O link de cancelamento está incompleto.', 400)
  }

  const verified = verifyUnsubscribeToken(token)
  if (verified.valid === false) {
    return htmlResponse('Token inválido', verified.error, 400)
  }

  const adminClient = await createAdminClient()
  const { error } = await adminClient.from('email_unsubscribes').upsert(
    {
      organization_id: verified.payload.organizationId,
      customer_email: verified.payload.customerEmail,
      unsubscribed_at: new Date().toISOString(),
    },
    {
      onConflict: 'organization_id,customer_email',
    },
  )

  if (error) {
    return htmlResponse('Erro ao processar pedido', 'Não foi possível registar o cancelamento.', 500)
  }

  return htmlResponse(
    'Cancelamento confirmado',
    'O seu endereço foi removido das comunicações associadas a esta organização.',
    200,
  )
}
