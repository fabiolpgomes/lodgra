import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params;
  try {
    // 1. Verify authentication & authorization
    const auth = await requireRole(["gestor", "admin"]);
    if (!auth.authorized || !auth.userId) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, organizationId } = auth;

    // 2. Verify user has access to this property
    const supabase = createAdminClient();
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id, organization_id")
      .eq("id", propertyId)
      .eq("organization_id", organizationId)
      .single();

    if (propError || !property) {
      return NextResponse.json(
        { error: "Property not found or access denied" },
        { status: 404 }
      );
    }

    // 3. Parse FormData (image file + metadata)
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const altText = formData.get("altText") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 4. Validate file
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type (jpeg, png, webp only)" },
        { status: 400 }
      );
    }

    // 5. Read file buffer for upload
    const buffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);

    // 6. Get next display_order
    const { data: images } = await supabase
      .from("property_images")
      .select("display_order")
      .eq("property_id", propertyId)
      .order("display_order", { ascending: false })
      .limit(1);

    const nextOrder = (images?.[0]?.display_order ?? -1) + 1;

    // 7. Generate unique ID for image
    const imageId = crypto.randomUUID();

    // 8. Upload original image
    // Path format: {organization_id}/{property_id}/{image_id}.{ext}
    // This matches what the process-image-variants Edge Function expects
    const extension = getExtension(file.type);
    const storagePath = `${organizationId}/${propertyId}/${imageId}${extension}`;
    
    const { error: uploadError } = await supabase.storage
      .from("property-images")
      .upload(storagePath, imageBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Image upload error detail:", uploadError);
      return NextResponse.json(
        { error: `Falha no Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 9. Create property_images record
    // The storage_path field will now point to the original file
    const { data: propertyImage, error: insertError } = await supabase
      .from("property_images")
      .insert({
        id: imageId,
        organization_id: organizationId,
        property_id: propertyId,
        original_filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        width: 1920, // Default placeholders, Edge Function will update if needed
        height: 1080,
        uploaded_by: userId,
        display_order: nextOrder,
        alt_text: altText || null,
        is_primary: false,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (insertError || !propertyImage) {
      console.error("Database insert error detail:", insertError);
      // Clean up uploaded file if DB insert fails
      await supabase.storage.from("property-images").remove([storagePath]);
      
      return NextResponse.json(
        { error: `Erro no Banco de Dados: ${insertError?.message || 'Falha ao criar registro'}` },
        { status: 500 }
      );
    }

    console.log(`✅ Image upload successful: ${imageId}. Triggering variant processing...`);

    // 10. Manually trigger the process-image-variants Edge Function
    // This replaces the unreliable SQL trigger that required pg_net extension
    try {
      const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-image-variants`;
      
      // Construct payload that mimics the StorageEvent structure expected by the Edge Function
      const edgePayload = {
        Records: [{
          s3: {
            bucket: { name: "property-images" },
            object: { key: storagePath }
          },
          eventName: "INSERT"
        }]
      };

      // Fire and forget (or log failure but don't stop the response)
      fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify(edgePayload)
      }).catch(err => console.error("Failed to trigger Edge Function:", err));
      
    } catch (edgeError) {
      console.error("Error setting up Edge Function call:", edgeError);
    }

    return NextResponse.json(
      {
        success: true,
        image: propertyImage,
        message: "Image uploaded. Processing gallery in background...",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper: Get file extension based on MIME type
function getExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  return extensions[mimeType] || ".jpg";
}
