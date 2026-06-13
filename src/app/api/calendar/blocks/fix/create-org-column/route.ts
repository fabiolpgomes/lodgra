import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/calendar/blocks/fix/create-org-column
export async function POST(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient()

    // Execute raw SQL to add missing column and apply RLS policies
    const { error: error1 } = await adminSupabase.rpc('exec_sql', {
      sql: `ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;`,
    }).catch(() => ({ error: { message: 'RPC not available, will use alternative' } }))

    // Since RPC might not be available, we'll document what needs to be done
    console.log('[Fix] Attempting to add organization_id column to calendar_blocks')

    // Try using the standard Supabase client to execute SQL
    // This won't work directly, so we need to use a different approach

    return NextResponse.json({
      status: 'pending',
      message: 'Migration needs to be applied manually in Supabase console',
      steps: [
        '1. Open Supabase Dashboard → SQL Editor',
        '2. Run this SQL:',
        '',
        'ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;',
        'ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES auth.users(id);',
        'ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS external_uid TEXT;',
        '',
        'CREATE INDEX IF NOT EXISTS idx_calendar_blocks_property ON calendar_blocks(property_id);',
        'CREATE INDEX IF NOT EXISTS idx_calendar_blocks_org ON calendar_blocks(organization_id);',
        'CREATE INDEX IF NOT EXISTS idx_calendar_blocks_dates ON calendar_blocks(start_date, end_date);',
        'CREATE INDEX IF NOT EXISTS idx_calendar_blocks_external_uid ON calendar_blocks(external_uid);',
        '',
        'UPDATE calendar_blocks',
        'SET organization_id = (SELECT organization_id FROM properties WHERE id = property_id)',
        'WHERE organization_id IS NULL;',
        '',
        'ALTER TABLE calendar_blocks ALTER COLUMN organization_id SET NOT NULL;',
        '',
        'DROP POLICY IF EXISTS "Service role full access calendar_blocks" ON calendar_blocks;',
        '',
        'CREATE POLICY "org_members_can_view_blocks" ON calendar_blocks',
        '  FOR SELECT USING (',
        '    organization_id = public.get_user_organization_id()',
        '  );',
        '',
        'CREATE POLICY "admins_can_create_blocks" ON calendar_blocks',
        '  FOR INSERT WITH CHECK (',
        '    organization_id = public.get_user_organization_id()',
        '    AND EXISTS (',
        '      SELECT 1 FROM user_profiles',
        '      WHERE id = auth.uid()',
        '      AND organization_id = public.get_user_organization_id()',
        '      AND role IN (\'admin\', \'gestor\')',
        '    )',
        '  );',
        '',
        'CREATE POLICY "admins_can_update_blocks" ON calendar_blocks',
        '  FOR UPDATE USING (',
        '    organization_id = public.get_user_organization_id()',
        '    AND EXISTS (',
        '      SELECT 1 FROM user_profiles',
        '      WHERE id = auth.uid()',
        '      AND organization_id = public.get_user_organization_id()',
        '      AND role IN (\'admin\', \'gestor\')',
        '    )',
        '  );',
        '',
        'CREATE POLICY "admins_can_delete_blocks" ON calendar_blocks',
        '  FOR DELETE USING (',
        '    organization_id = public.get_user_organization_id()',
        '    AND EXISTS (',
        '      SELECT 1 FROM user_profiles',
        '      WHERE id = auth.uid()',
        '      AND organization_id = public.get_user_organization_id()',
        '      AND role IN (\'admin\', \'gestor\')',
        '    )',
        '  );',
        '',
        'CREATE POLICY "Service role full access calendar_blocks" ON calendar_blocks',
        '  FOR ALL TO service_role USING (true) WITH CHECK (true);',
      ],
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
