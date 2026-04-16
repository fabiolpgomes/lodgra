const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigration() {
  const migrationFile = path.join(__dirname, '../supabase/migrations/20260325_02_add_organization_id_to_tables.sql');
  const sql = fs.readFileSync(migrationFile, 'utf-8');

  console.log('Running migration 20260325_02_add_organization_id_to_tables.sql...');

  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error('Migration error:', error);
      process.exit(1);
    }
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

runMigration();
