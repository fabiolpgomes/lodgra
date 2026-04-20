import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role, organization_id')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const html = `
    <html>
      <body style="font-family: sans-serif; padding: 40px; background: #f4f7f6;">
        <h1>Lista de Usuários no Banco Local</h1>
        <table border="1" cellpadding="10" style="border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr style="background: #1E3A8A; color: white;">
            <th>Email</th>
            <th>Nome</th>
            <th>Cargo Atual</th>
            <th>Org ID</th>
            <th>Ação</th>
          </tr>
          ${profiles?.map(u => `
            <tr>
              <td>${u.email}</td>
              <td>${u.full_name}</td>
              <td style="font-weight: bold; color: ${u.role === 'admin' ? 'green' : 'red'}">${u.role}</td>
              <td>${u.organization_id || '---'}</td>
              <td>
                <a href="/api/dev/promote?email=${u.email}" style="background: #1E3A8A; color: white; padding: 5px 10px; border-radius: 4px; text-decoration: none; font-size: 12px;">
                  Promover p/ ADM
                </a>
              </td>
            </tr>
          `).join('')}
        </table>
        <p style="margin-top: 20px;"><a href="/">Voltar para o App</a></p>
      </body>
    </html>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}
