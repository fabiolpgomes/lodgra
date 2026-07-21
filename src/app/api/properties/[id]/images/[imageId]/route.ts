// API: DELETE /api/properties/[id]/images/[imageId]
// Delete image from property gallery

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id: propertyId, imageId } = await params;
  try {

    // 1. Verify authentication & authorization (admin only)
    const auth = await requireRole(["admin"]);
    if (!auth) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
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

    // 3. Get image record
    const { data: image, error: getError } = await supabase
      .from("property_images")
      .select("*")
      .eq("id", imageId)
      .eq("property_id", propertyId)
      .single();

    if (getError || !image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // 4. Delete image variants from Storage
    const storagePaths = [
      `${organizationId}/${propertyId}/${imageId}/original.jpg`,
      `${organizationId}/${propertyId}/${imageId}/thumb.webp`,
      `${organizationId}/${propertyId}/${imageId}/mobile.webp`,
      `${organizationId}/${propertyId}/${imageId}/tablet.webp`,
      `${organizationId}/${propertyId}/${imageId}/desktop.webp`,
      `${organizationId}/${propertyId}/${imageId}/thumb.jpeg`,
      `${organizationId}/${propertyId}/${imageId}/mobile.jpeg`,
      `${organizationId}/${propertyId}/${imageId}/tablet.jpeg`,
      `${organizationId}/${propertyId}/${imageId}/desktop.jpeg`,
    ];

    // Delete files from Storage (ignore errors for non-existent files)
    const { error: deleteStorageError } = await supabase.storage
      .from("property-images")
      .remove(storagePaths);

    if (deleteStorageError) {
      console.warn("Storage deletion error (non-fatal):", deleteStorageError);
    }

    // 5. Delete image_variants records
    const { error: deleteVariantsError } = await supabase
      .from("image_variants")
      .delete()
      .eq("property_image_id", imageId);

    if (deleteVariantsError) {
      console.error("Variants delete error:", deleteVariantsError);
    }

    // 6. Delete property_images record
    const { error: deleteError } = await supabase
      .from("property_images")
      .delete()
      .eq("id", imageId);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete image" },
        { status: 500 }
      );
    }

    // 7. If deleted image was primary, unset is_primary flag
    if (image.is_primary) {
      const { data: firstImage } = await supabase
        .from("property_images")
        .select("id")
        .eq("property_id", propertyId)
        .order("display_order")
        .limit(1)
        .single();

      if (firstImage) {
        await supabase
          .from("property_images")
          .update({ is_primary: true })
          .eq("id", firstImage.id);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Image deleted successfully",
        imageId,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
