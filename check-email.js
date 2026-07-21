import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data, error } = await supabase
  .from("raw_emails")
  .select("provider_message_id, sender, processing_status, last_error, created_at")
  .eq("organization_id", "00000000-0000-0000-0000-000000000001")
  .order("created_at", { ascending: false })
  .limit(3);

if (error) {
  console.error("Error:", error);
} else {
  console.table(data);
}
