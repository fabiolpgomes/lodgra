#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setupStorageRLS() {
  console.log('🔒 Setting up Storage RLS Policies...\n');

  try {
    // Storage bucket policies are managed via Supabase Dashboard or Admin API
    // We'll document the required policies and create them if API supports it

    console.log('📋 RLS Policies to create:\n');

    const policies = [
      {
        name: 'Allow managers to upload images',
        bucket: 'property-images',
        definition: `
          (bucket_id = 'property-images')
          AND
          (
            auth.jwt() ->> 'role' = 'admin' OR
            auth.jwt() ->> 'role' = 'manager'
          )
        `,
        operations: ['INSERT']
      },
      {
        name: 'Allow users to view images in their organization',
        bucket: 'property-images',
        definition: `
          (bucket_id = 'property-images')
          AND
          (owner_id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'manager'))
        `,
        operations: ['SELECT']
      },
      {
        name: 'Allow public access to images (public properties)',
        bucket: 'property-images',
        definition: `
          (bucket_id = 'property-images')
          AND
          (path_tokens[1] LIKE '%public%')
        `,
        operations: ['SELECT']
      }
    ];

    policies.forEach((policy, index) => {
      console.log(`${index + 1}. ${policy.name}`);
      console.log(`   Bucket: ${policy.bucket}`);
      console.log(`   Operations: ${policy.operations.join(', ')}`);
      console.log();
    });

    console.log('\n⚠️  NOTE: Storage RLS policies must be created via Supabase Dashboard:');
    console.log('  1. Go to Supabase Dashboard → Storage → property-images');
    console.log('  2. Click "Policies" tab');
    console.log('  3. Add policies above for INSERT, SELECT, UPDATE, DELETE');
    console.log('  4. Use role-based checks: admin, manager, viewer');
    console.log('\n📚 Reference: docs/SCHEMA_PROPERTY_IMAGES.md (RLS section)');

    // Alternatively, create via Edge Function that can manage policies
    console.log('\n✅ Storage bucket is ready for policy configuration');
    console.log('   Next: Deploy Edge Function to handle image processing');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

setupStorageRLS();
