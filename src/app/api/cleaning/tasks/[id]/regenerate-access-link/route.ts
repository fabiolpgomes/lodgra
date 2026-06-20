import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { generateAccessToken, hashToken } from '@/lib/cleaner-tokens'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id: taskId } = await params
    const supabase = await createClient()

    // Verificar se tarefa existe e pertence à organização
    const { data: task, error: taskError } = await supabase
      .from('cleaning_tasks')
      .select('id, cleaner_id, organization_id')
      .eq('id', taskId)
      .eq('organization_id', auth.organizationId)
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Tarefa não encontrada' },
        { status: 404 }
      )
    }

    if (!task.cleaner_id) {
      return NextResponse.json(
        { error: 'Tarefa não tem limpador atribuído' },
        { status: 400 }
      )
    }

    // Deletar tokens antigos para esta tarefa
    await supabase
      .from('cleaner_access_tokens')
      .delete()
      .eq('cleaner_id', task.cleaner_id)

    // Gerar novo token
    const plainToken = await generateAccessToken()
    const tokenHash = hashToken(plainToken)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias

    const { error: insertError } = await supabase
      .from('cleaner_access_tokens')
      .insert({
        cleaner_id: task.cleaner_id,
        organization_id: auth.organizationId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        ip_address: '0.0.0.0',
        user_agent: 'system',
      })

    if (insertError) {
      return NextResponse.json(
        { error: 'Erro ao gerar novo link' },
        { status: 500 }
      )
    }

    const accessLink = `/cleaner/auth?token=${plainToken}`

    return NextResponse.json({
      success: true,
      accessLink,
      expiresAt: expiresAt.toISOString(),
      message: 'Novo link de acesso gerado com sucesso',
    })
  } catch (error) {
    console.error('Error regenerating access link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
