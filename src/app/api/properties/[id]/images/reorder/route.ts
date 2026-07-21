// API: PATCH /api/properties/[id]/images/reorder
// Reorder images in gallery

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

interface ReorderPayload {
  images: Array<{ id: string; display_order: number }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params;
  try {

    // 1. Verify authentication & authorization
    const auth = await requireRole(["gestor", "admin"]);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = auth;

    // 2. Verify user has access to this property
    const supabase = createAdminClient();
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("organization_id", organizationId)
      .single();

    if (propError || !property) {
      return NextResponse.json(
        { error: "Property not found or access denied" },
        { status: 404 }
      );
    }

    // 3. Parse request body
    const body: ReorderPayload = await request.json();

    if (!Array.isArray(body.images) || body.images.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: images array required" },
        { status: 400 }
      );
    }

    // 4. Update display_order for each image
    // Use individual updates to avoid upsert overwriting existing columns
    const now = new Date().toISOString();

    for (const { id, display_order } of body.images) {
      const { error: updateError } = await supabase
        .from("property_images")
        .update({
          display_order,
          updated_at: now,
        })
        .eq("id", id);

      if (updateError) {
        console.error(`Error updating image ${id}:`, updateError);
        return NextResponse.json(
          { error: `Failed to update image ${id}` },
          { status: 500 }
        );
      }
    }

    // 5. Fetch updated images
    const { data: images, error: fetchError } = await supabase
      .from("property_images")
      .select("*")
      .eq("property_id", propertyId)
      .order("display_order");

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch updated images" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        images,
        message: "Images reordered successfully",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
