import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

// GET — returns a signed download URL (60 min)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'viewer'])
    if (!auth.authorized) return auth.response!

    const { id: propertyId, docId } = await params
    const supabase = await createClient()

    if (!(await verifyPropertyAccess(supabase, propertyId, auth.organizationId!))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { data: doc, error: fetchError } = await supabase
      .from('property_documents')
      .select('file_path')
      .eq('id', docId)
      .eq('property_id', propertyId)
      .single()

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    const adminClient = createAdminClient()
    const { data: signed, error: signError } = await adminClient.storage
      .from('property-documents')
      .createSignedUrl(doc.file_path, 3600)

    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Erro ao gerar link de download' }, { status: 500 })
    }

    return NextResponse.json({ url: signed.signedUrl })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

// DELETE — remove document record + storage file
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id: propertyId, docId } = await params
    const supabase = await createClient()

    if (!(await verifyPropertyAccess(supabase, propertyId, auth.organizationId!))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { data: doc, error: fetchError } = await supabase
      .from('property_documents')
      .select('file_path')
      .eq('id', docId)
      .eq('property_id', propertyId)
      .single()

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    const adminClient = createAdminClient()
    await adminClient.storage.from('property-documents').remove([doc.file_path])

    const { error: deleteError } = await supabase
      .from('property_documents')
      .delete()
      .eq('id', docId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
