import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id, photoId } = await params;
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

    // Get photo and verify ownership
    const { data: photo, error: photoError } = await supabase
      .from('cleaning_photos')
      .select('*')
      .eq('id', photoId)
      .eq('task_id', id)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Verify user is the uploader or an admin/manager
    const isUploader = photo.uploader_id === user.id;
    if (!isUploader) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userProfile || !['admin', 'manager'].includes(userProfile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('cleaning-photos')
      .remove([photo.file_path]);

    if (storageError) throw storageError;

    // Delete from database
    const { error: dbError } = await supabase
      .from('cleaning_photos')
      .delete()
      .eq('id', photoId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/cleaner/tasks/[id]/photos/[photoId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
