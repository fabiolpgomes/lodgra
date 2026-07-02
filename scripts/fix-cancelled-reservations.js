#!/usr/bin/env node
/**
 * Fix: Restore reservations incorrectly marked as cancelled in July & August 2026
 * Issue: Calendar synchronization incorrectly updated reservation status to 'cancelled'
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://brjumbfpvijrkhrheppt.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixCancelledReservations() {
  try {
    console.log("🔧 Starting reservation fix for July & August 2026...\n");

    // Fetch cancelled reservations in July and August
    const { data: cancelledReservations, error: fetchError } = await supabase
      .from("reservations")
      .select(
        `
        id,
        check_in,
        check_out,
        guest_id,
        status,
        cancelled_at,
        cancellation_reason,
        external_reservation_id
      `
      )
      .eq("status", "cancelled")
      .gte("check_in", "2026-07-01")
      .lte("check_in", "2026-08-31");

    if (fetchError) {
      console.error("❌ Error fetching cancelled reservations:", fetchError);
      process.exit(1);
    }

    console.log(`📋 Found ${cancelledReservations.length} cancelled reservations in July-August 2026\n`);

    if (cancelledReservations.length === 0) {
      console.log("✅ No cancelled reservations found. Nothing to fix.");
      process.exit(0);
    }

    // List the reservations to be fixed
    console.log("Reservations to be restored:");
    cancelledReservations.forEach((res, idx) => {
      console.log(
        `${idx + 1}. Check-in: ${res.check_in}, Status: ${res.status}, Reason: ${res.cancellation_reason || "N/A"}`
      );
    });
    console.log();

    // Update reservations
    const { error: updateError, data: updatedData } = await supabase
      .from("reservations")
      .update({
        status: "confirmed",
        cancelled_at: null,
        cancellation_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("status", "cancelled")
      .gte("check_in", "2026-07-01")
      .lte("check_in", "2026-08-31")
      .select();

    if (updateError) {
      console.error("❌ Error updating reservations:", updateError);
      process.exit(1);
    }

    console.log(`✅ Successfully restored ${updatedData?.length || cancelledReservations.length} reservations!\n`);

    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from("reservations")
      .select("id, status, check_in")
      .eq("status", "confirmed")
      .gte("check_in", "2026-07-01")
      .lte("check_in", "2026-08-31");

    if (verifyError) {
      console.error("❌ Error verifying update:", verifyError);
      process.exit(1);
    }

    console.log(`📊 Verification: ${verifyData.length} confirmed reservations now in July-August\n`);
    console.log("✨ Reservation fix complete!");
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    process.exit(1);
  }
}

fixCancelledReservations();
