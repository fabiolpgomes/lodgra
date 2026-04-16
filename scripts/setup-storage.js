#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setupStorage() {
  console.log('📦 Setting up Supabase Storage...\n');

  try {
    // 1. List existing buckets
    console.log('📋 Listing existing buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      process.exit(1);
    }

    const bucketNames = buckets.map(b => b.name);
    console.log(`   Found ${buckets.length} bucket(s):`, bucketNames);

    // 2. Check if property-images bucket exists
    const propertyImagesExists = bucketNames.includes('property-images');

    if (propertyImagesExists) {
      console.log('\n✅ Bucket "property-images" already exists');
    } else {
      console.log('\n🔨 Creating bucket "property-images"...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('property-images', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        process.exit(1);
      }

      console.log('✅ Bucket created:', newBucket.name);
    }

    // 3. Summary
    console.log('\n✅ Storage setup complete!');
    console.log('\nNext steps:');
    console.log('  1. Deploy Edge Function: process-image-variants');
    console.log('  2. Create RLS policies for bucket (via Supabase Dashboard)');
    console.log('  3. Implement API endpoints for upload');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

setupStorage();
