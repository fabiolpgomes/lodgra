const { createAdminClient } = require('./src/lib/supabase/admin');

async function main() {
  const client = createAdminClient();
  
  const { data: org, error: orgError } = await client
    .from('organizations')
    .select('id, name, subscription_plan, plan, premium_extra_properties_count')
    .eq('id', '0000000000000001')
    .single();

  if (orgError) {
    console.error('Org error:', orgError);
    process.exit(1);
  }

  console.log('📋 Organization:', {
    id: org.id,
    name: org.name,
    subscription_plan: org.subscription_plan,
    plan: org.plan,
    premium_extra_properties_count: org.premium_extra_properties_count,
  });

  const { count, error: countError } = await client
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', '0000000000000001');

  if (countError) {
    console.error('Count error:', countError);
    process.exit(1);
  }

  console.log('🏠 Total properties:', count);

  process.exit(0);
}

main();
