import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id: taskId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify task belongs to cleaner
    const { data: task } = await supabase
      .from('cleaning_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('cleaner_id', user.id)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }

    const uploadedPhotos: string[] = [];

    // Upload each photo to Supabase Storage
    for (const file of files) {
      const timestamp = Date.now();
      const fileName = `${taskId}/${timestamp}-${file.name}`;
      const bucket = 'cleaning-task-photos';

      const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        console.error('Upload error:', error);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      uploadedPhotos.push(publicUrlData.publicUrl);
    }

    // Update task with photo count
    const currentPhotos = task.photos || [];
    const allPhotos = [...currentPhotos, ...uploadedPhotos];

    const { error: updateError } = await supabase
      .from('cleaning_tasks')
      .update({
        photos: allPhotos,
        photo_count: allPhotos.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      uploaded: uploadedPhotos.length,
      totalPhotos: allPhotos.length,
      photos: uploadedPhotos,
    });
  } catch (error) {
    console.error('Error uploading photos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload photos' },
      { status: 500 }
    );
  }
}
