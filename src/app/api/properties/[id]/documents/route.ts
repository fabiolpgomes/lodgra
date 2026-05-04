import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'video/quicktime',
]

const MAX_DOC_SIZE = 20 * 1024 * 1024   // 20MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_FILES = 10

async function verifyPropertyAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyId: string,
  organizationId: string
) {
  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('organization_id', organizationId)
    .single()
  return !error && !!data
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'viewer'])
    if (!auth.authorized) return auth.response!

    const { id: propertyId } = await params
    const supabase = await createClient()

    if (!(await verifyPropertyAccess(supabase, propertyId, auth.organizationId!))) {
      return NextResponse.json({ error: 'Propriedade não encontrada ou acesso negado' }, { status: 404 })
    }

    const { data: documents, error } = await supabase
      .from('property_documents')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ documents })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id: propertyId } = await params
    const supabase = await createClient()

    if (!(await verifyPropertyAccess(supabase, propertyId, auth.organizationId!))) {
      return NextResponse.json({ error: 'Propriedade não encontrada ou acesso negado' }, { status: 404 })
    }

    const { count } = await supabase
      .from('property_documents')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId)

    if ((count ?? 0) >= MAX_FILES) {
      return NextResponse.json({ error: `Máximo de ${MAX_FILES} ficheiros por propriedade` }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Nenhum ficheiro enviado' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de ficheiro não permitido' }, { status: 400 })
    }

    const isVideo = file.type === 'video/mp4' || file.type === 'video/quicktime'
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_DOC_SIZE
    if (file.size > maxSize) {
      return NextResponse.json({ error: `Ficheiro excede ${isVideo ? '100' : '20'}MB` }, { status: 400 })
    }

    const fileId = crypto.randomUUID()
    const storagePath = `${propertyId}/${fileId}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const adminClient = createAdminClient()

    const { error: uploadError } = await adminClient.storage
      .from('property-documents')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: `Erro no Storage: ${uploadError.message}` }, { status: 500 })
    }

    const documentType = isVideo ? 'video' : 'other'
    const { data: doc, error: insertError } = await supabase
      .from('property_documents')
      .insert({
        property_id: propertyId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        document_type: documentType,
      })
      .select()
      .single()

    if (insertError) {
      await adminClient.storage.from('property-documents').remove([storagePath])
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
