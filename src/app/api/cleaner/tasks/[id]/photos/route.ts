import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role, id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify task belongs to user's organization
    const { data: task } = await supabase
      .from('cleaning_tasks')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const fileName = `${profile.organization_id}/${id}/${Date.now()}-${file.name}`;
    const buffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('cleaning-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: photoRecord, error: dbError } = await supabase
      .from('cleaning_photos')
      .insert({
        task_id: id,
        file_path: uploadData.path,
        uploader_id: user.id,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json(photoRecord, { status: 201 });
  } catch (error) {
    console.error('POST /api/cleaner/tasks/[id]/photos error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify task belongs to user's organization
    const { data: task } = await supabase
      .from('cleaning_tasks')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const { data: photos, error } = await supabase
      .from('cleaning_photos')
      .select('*')
      .eq('task_id', id)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    // Generate signed URLs for each photo (1 hour expiry)
    const photosWithUrls = await Promise.all(
      (photos || []).map(async (photo) => {
        const { data } = await supabase.storage
          .from('cleaning-photos')
          .createSignedUrl(photo.file_path, 3600);

        return {
          ...photo,
          url: data?.signedUrl || null,
        };
      })
    );

    return NextResponse.json(photosWithUrls);
  } catch (error) {
    console.error('GET /api/cleaner/tasks/[id]/photos error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
