// Edge Function: Process Image Variants
// Purpose: Generate responsive WebP/JPEG variants on image upload to Supabase Storage
// Trigger: Storage event on property-images bucket
// Runtime: Deno

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import Vips from "https://esm.sh/wasm-vips@0.0.10";

// Types
interface StorageEvent {
  Records: Array<{
    s3: {
      bucket: {
        name: string;
      };
      object: {
        key: string;
      };
    };
    eventName: string;
  }>;
}

interface ImageVariantRecord {
  property_image_id: string;
  variant_type: "thumb" | "mobile" | "tablet" | "desktop" | "original";
  storage_path: string;
  width: number;
  height: number;
  file_size_bytes: number;
  format: "webp" | "jpeg";
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Variant specifications
const VARIANTS = [
  { name: "thumb", width: 300, height: 300, fit: "cover" },
  { name: "mobile", width: 600, height: 600, fit: "inside" },
  { name: "tablet", width: 1200, height: 1200, fit: "inside" },
  { name: "desktop", width: 1920, height: 1080, fit: "inside" },
];

// Main handler
serve(async (req: Request) => {
  try {
    // Only handle POST requests
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Parse webhook payload
    const payload = await req.json();
    const event: StorageEvent = payload;

    if (!event.Records || event.Records.length === 0) {
      return new Response("No records to process", { status: 200 });
    }

    // Initialize Vips
    const vips = await Vips();

    // Process each uploaded file
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const objectKey = record.s3.object.key;

      // Only process property-images bucket
      if (bucket !== "property-images") continue;

      // Parse path: {organization_id}/{property_id}/{temp_id}.jpg
      const pathParts = objectKey.split("/");
      if (pathParts.length < 3) {
        console.warn(`Invalid path format: ${objectKey}`);
        continue;
      }

      const organizationId = pathParts[0];
      const propertyId = pathParts[1];
      const fileName = pathParts[pathParts.length - 1];
      const [fileId] = fileName.split(".");

      console.log(
        `[process-image-variants] Processing: org=${organizationId}, prop=${propertyId}, file=${fileName}`
      );

      // 1. Download original image
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(objectKey);

      if (downloadError || !fileData) {
        console.error(`[process-image-variants] Download error: ${downloadError?.message}`);
        continue;
      }

      const buffer = await fileData.arrayBuffer();
      const inputImage = vips.Image.newFromBuffer(buffer);

      const variantRecords: ImageVariantRecord[] = [];

      // 2. Generate variants
      for (const variantSpec of VARIANTS) {
        // Redimensionar
        let resizedImage = inputImage;
        if (variantSpec.fit === "cover") {
          // Thumbnail square crop
          const size = Math.min(inputImage.width, inputImage.height);
          resizedImage = inputImage.crop(
            (inputImage.width - size) / 2,
            (inputImage.height - size) / 2,
            size,
            size
          ).thumbnailImage(variantSpec.width);
        } else {
          // Aspect ratio scaling
          resizedImage = inputImage.thumbnailImage(variantSpec.width);
        }

        // 3. Gerar WebP
        const webpBuffer = resizedImage.writeToBuffer(".webp", { Q: 75 });
        const webpPath = `${organizationId}/${propertyId}/${fileId}/${variantSpec.name}.webp`;
        
        const { error: webpUploadError } = await supabase.storage
          .from(bucket)
          .upload(webpPath, webpBuffer, {
            contentType: "image/webp",
            cacheControl: "31536000",
            upsert: true,
          });

        if (!webpUploadError) {
          variantRecords.push({
            property_image_id: fileId,
            variant_type: variantSpec.name as ImageVariantRecord["variant_type"],
            storage_path: webpPath,
            width: resizedImage.width,
            height: resizedImage.height,
            file_size_bytes: webpBuffer.byteLength,
            format: "webp",
          });
        }

        // 4. Gerar JPEG (Fallback)
        const jpegBuffer = resizedImage.writeToBuffer(".jpg", { Q: 80 });
        const jpegPath = `${organizationId}/${propertyId}/${fileId}/${variantSpec.name}.jpeg`;
        
        const { error: jpegUploadError } = await supabase.storage
          .from(bucket)
          .upload(jpegPath, jpegBuffer, {
            contentType: "image/jpeg",
            cacheControl: "31536000",
            upsert: true,
          });

        if (!jpegUploadError) {
          variantRecords.push({
            property_image_id: fileId,
            variant_type: variantSpec.name as ImageVariantRecord["variant_type"],
            storage_path: jpegPath,
            width: resizedImage.width,
            height: resizedImage.height,
            file_size_bytes: jpegBuffer.byteLength,
            format: "jpeg",
          });
        }

        resizedImage.delete();
      }

      // 5. Insert records in database
      const { error: variantError } = await supabase
        .from("image_variants")
        .insert(variantRecords);

      if (variantError) {
        console.error(`[process-image-variants] DB Error: ${variantError.message}`);
      }

      // 6. Cleanup image objects
      inputImage.delete();

      console.log(`[process-image-variants] ✅ Processed ${fileId}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Variants processed" }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`[process-image-variants] Global Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
