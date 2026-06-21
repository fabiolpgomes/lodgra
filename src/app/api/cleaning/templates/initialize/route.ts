import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { seedCleaningTemplates } from '@/lib/seeds/cleaning-templates.seed';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (!auth.authorized) return auth.response!;

    const result = await seedCleaningTemplates(auth.organizationId);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error initializing templates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize templates' },
      { status: 500 }
    );
  }
}
