import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ChecklistItem {
  label: string;
  category: string;
  is_required: boolean;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('cleaning_checklist_templates')
      .select('*,cleaning_checklist_items(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET templates:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, items } = body;

    const { data: template, error: e1 } = await supabase
      .from('cleaning_checklist_templates')
      .insert({ name })
      .select()
      .single();

    if (e1) throw e1;

    if (items.length > 0) {
      await supabase
        .from('cleaning_checklist_items')
        .insert(
          items.map((item: ChecklistItem, i: number) => ({
            template_id: template.id,
            label: item.label,
            category: item.category,
            is_required: item.is_required,
            order: i,
          }))
        );
    }

    return NextResponse.json({ ...template, items }, { status: 201 });
  } catch (error) {
    console.error('POST template:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
