import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const taskId = id

    // Verify task belongs to this cleaner
    const { data: task, error: fetchError } = await supabase
      .from('cleaning_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('cleaner_id', user.id)
      .single()

    if (fetchError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.status !== 'pending') {
      return NextResponse.json(
        { error: 'Task is not pending' },
        { status: 400 }
      )
    }

    // Update task status to in_progress
    const { data: updatedTask, error: updateError } = await supabase
      .from('cleaning_tasks')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Error starting task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
