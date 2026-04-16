# Edge Function: Image Processing & Variant Generation

**Function Name**: `process-image-variants`
**Runtime**: Node.js
**Trigger**: Supabase Storage (upload to `property-images` bucket)
**Purpose**: Generate responsive WebP/JPEG variants and update database

## Overview

When a property image is uploaded to Supabase Storage, this Edge Function automatically:

1. **Validates** the original image (format, size, dimensions)
2. **Generates** responsive variants (thumb, mobile, tablet, desktop)
3. **Converts** to WebP (primary) and JPEG (fallback)
4. **Uploads** variants back to Storage
5. **Records** metadata in database (`property_images` + `image_variants`)

## Deployment

```bash
# Create function
supabase functions new process-image-variants

# Deploy to production
supabase functions deploy process-image-variants --project-id YOUR_PROJECT_ID
```

## Environment Variables

```env
# Supabase
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  (required for admin access)

# Image Processing
SHARP_TIMEOUT=30000  (ms, max processing time)
MAX_IMAGE_SIZE=10485760  (bytes, 10MB)
```

## Function Specification

### Input Payload

```typescript
{
  bucket: "property-images",
  name: "{organization_id}/{property_id}/{temp_id}.jpg",
  event: "INSERT",
  record: {
    id: "uuid",
    name: "...",
    owner: "user-uuid",
    created_at: "2026-03-25T..."
  }
}
```

### Processing Steps

#### Step 1: Validate Original

```typescript
// Constraints
- Format: JPEG, PNG, WebP only
- Size: < 10MB
- Dimensions: Between 300x300 and 8000x8000 px
- Aspect Ratio: 0.5 to 2.0 (not extreme panoramas)

// Extract metadata
- Width, height
- File size
- MIME type
```

#### Step 2: Generate Variants

Using `sharp` or `libvips`:

```typescript
const variants = [
  { name: 'thumb',   width: 300,  height: 300,  fit: 'cover' },
  { name: 'mobile',  width: 600,  height: 600,  fit: 'cover' },
  { name: 'tablet',  width: 1024, height: 1024, fit: 'cover' },
  { name: 'desktop', width: 1920, height: 1920, fit: 'cover' },
];

for (const variant of variants) {
  // Generate WebP (quality 80)
  await image
    .resize(variant.width, variant.height, { fit: variant.fit })
    .webp({ quality: 80 })
    .toFile(`${variant.name}.webp`);

  // Generate JPEG (quality 85, fallback)
  await image
    .resize(variant.width, variant.height, { fit: variant.fit })
    .jpeg({ quality: 85 })
    .toFile(`${variant.name}.jpeg`);
}
```

#### Step 3: Upload Variants

```typescript
// Upload each variant to Storage
// Path: {organization_id}/{property_id}/{image_id}/{variant}.{format}

for (const variant of variants) {
  // WebP
  await storage.from('property-images')
    .upload(`${orgId}/${propId}/${imageId}/${variant.name}.webp`, webpFile, {
      contentType: 'image/webp',
      cacheControl: '31536000',  // 1 year (immutable)
      upsert: true
    });

  // JPEG
  await storage.from('property-images')
    .upload(`${orgId}/${propId}/${imageId}/${variant.name}.jpeg`, jpegFile, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: true
    });
}
```

#### Step 4: Update Database

```typescript
// Insert into property_images
const { data: image } = await supabase
  .from('property_images')
  .insert({
    organization_id: orgId,
    property_id: propId,
    original_filename: originalName,
    file_size_bytes: fileSize,
    width: originalWidth,
    height: originalHeight,
    mime_type: mimeType,
    uploaded_by: userId,
    display_order: (await supabase
      .from('property_images')
      .select('display_order')
      .eq('property_id', propId)
      .order('display_order', { ascending: false })
      .limit(1))[0]?.display_order + 1 || 0,
  })
  .select()
  .single();

// Insert variants into image_variants
const variantRecords = variants.flatMap(v => [
  {
    property_image_id: image.id,
    variant_type: v.name,
    storage_path: `${orgId}/${propId}/${image.id}/${v.name}.webp`,
    width: v.width,
    height: v.height,
    format: 'webp',
    file_size_bytes: webpFileSize,
  },
  {
    property_image_id: image.id,
    variant_type: v.name,
    storage_path: `${orgId}/${propId}/${image.id}/${v.name}.jpeg`,
    width: v.width,
    height: v.height,
    format: 'jpeg',
    file_size_bytes: jpegFileSize,
  }
]);

await supabase
  .from('image_variants')
  .insert(variantRecords);
```

#### Step 5: Return Response

```typescript
{
  success: true,
  image_id: "uuid",
  variants: [
    {
      type: 'thumb',
      webp: 'https://project.supabase.co/storage/v1/object/public/property-images/...',
      jpeg: '...'
    },
    // ... rest of variants
  ]
}
```

### Error Handling

```typescript
// Validation errors (400)
- Invalid format
- File too large
- Dimensions out of range
- Corrupted image file

// Processing errors (500)
- Sharp/libvips processing timeout
- Storage upload failure
- Database insertion failure

// All errors logged with:
- timestamp
- organization_id
- property_id
- error details (for debugging)
```

## Implementation (TypeScript)

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Admin access
);

const VARIANTS = [
  { name: "thumb", width: 300, height: 300 },
  { name: "mobile", width: 600, height: 600 },
  { name: "tablet", width: 1024, height: 1024 },
  { name: "desktop", width: 1920, height: 1920 },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];

export async function processImageVariants(
  bucket: string,
  filename: string
) {
  try {
    // 1. Extract metadata from filename
    const parts = filename.split("/");
    const organizationId = parts[0];
    const propertyId = parts[1];
    const tempId = parts[2].split(".")[0];

    // 2. Download original from Storage
    const { data: originalBuffer } = await supabase.storage
      .from(bucket)
      .download(filename);

    if (!originalBuffer) {
      throw new Error("Failed to download original image");
    }

    // 3. Validate image
    const metadata = await sharp(originalBuffer).metadata();
    if (!metadata.format || !ALLOWED_FORMATS.includes(metadata.format)) {
      throw new Error(`Invalid format: ${metadata.format}`);
    }
    if (originalBuffer.byteLength > MAX_FILE_SIZE) {
      throw new Error("File too large");
    }
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width < 300 ||
      metadata.height < 300
    ) {
      throw new Error("Image too small (min 300x300)");
    }

    // 4. Generate variants
    const image = sharp(originalBuffer);
    const variantFiles: Record<string, Buffer> = {};

    for (const variant of VARIANTS) {
      // WebP
      variantFiles[`${variant.name}.webp`] = await image
        .resize(variant.width, variant.height, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer();

      // JPEG fallback
      variantFiles[`${variant.name}.jpeg`] = await image
        .resize(variant.width, variant.height, { fit: "cover" })
        .jpeg({ quality: 85 })
        .toBuffer();
    }

    // 5. Upload variants to Storage
    const userId = "system"; // From request context in real implementation
    const newImageId = crypto.randomUUID();

    for (const [filename, buffer] of Object.entries(variantFiles)) {
      const path = `${organizationId}/${propertyId}/${newImageId}/${filename}`;
      const format = filename.endsWith(".webp") ? "webp" : "jpeg";

      await supabase.storage.from(bucket).upload(path, buffer, {
        contentType: format === "webp" ? "image/webp" : "image/jpeg",
        cacheControl: "31536000", // 1 year
        upsert: true,
      });
    }

    // 6. Insert database records
    const { data: propertyImage } = await supabase
      .from("property_images")
      .insert({
        organization_id: organizationId,
        property_id: propertyId,
        original_filename: filename.split("/").pop(),
        file_size_bytes: originalBuffer.byteLength,
        width: metadata.width,
        height: metadata.height,
        mime_type: metadata.format
          ? `image/${metadata.format}`
          : "image/jpeg",
        uploaded_by: userId,
        display_order: 0, // Set to 0, users can reorder
      })
      .select()
      .single();

    if (!propertyImage) {
      throw new Error("Failed to insert property_images");
    }

    // Insert variants
    const variantRecords = VARIANTS.flatMap((variant) => [
      {
        property_image_id: propertyImage.id,
        variant_type: variant.name,
        storage_path: `${organizationId}/${propertyId}/${newImageId}/${variant.name}.webp`,
        width: variant.width,
        height: variant.height,
        format: "webp",
        file_size_bytes: variantFiles[`${variant.name}.webp`].byteLength,
      },
      {
        property_image_id: propertyImage.id,
        variant_type: variant.name,
        storage_path: `${organizationId}/${propertyId}/${newImageId}/${variant.name}.jpeg`,
        width: variant.width,
        height: variant.height,
        format: "jpeg",
        file_size_bytes: variantFiles[`${variant.name}.jpeg`].byteLength,
      },
    ]);

    await supabase.from("image_variants").insert(variantRecords);

    // 7. Clean up temp original file
    await supabase.storage.from(bucket).remove([filename]);

    return {
      success: true,
      image_id: propertyImage.id,
      variants: VARIANTS.map((v) => ({
        type: v.name,
        webp: `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${organizationId}/${propertyId}/${newImageId}/${v.name}.webp`,
        jpeg: `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${organizationId}/${propertyId}/${newImageId}/${v.name}.jpeg`,
      })),
    };
  } catch (error) {
    console.error("Image processing error:", {
      bucket,
      filename,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
```

## Testing

```bash
# Local testing with Supabase
supabase functions serve

# Test with curl
curl -X POST http://localhost:54321/functions/v1/process-image-variants \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "bucket": "property-images",
    "name": "{org-id}/{prop-id}/test.jpg",
    "event": "INSERT"
  }'
```

## Monitoring

### CloudWatch Metrics

- Function duration
- Error rate
- File size distribution
- Variant generation time

### Logging

```
[2026-03-25T10:30:45.123Z] Processing image: org-xyz / prop-123
[2026-03-25T10:30:47.456Z] Generated 8 variants (4 types × 2 formats)
[2026-03-25T10:30:48.789Z] Uploaded to Storage: 2.3MB
[2026-03-25T10:30:49.012Z] Database records inserted: property_images + 8 variants
[2026-03-25T10:30:49.234Z] Success: image-456
```

---

**Related Documentation**: `docs/SCHEMA_PROPERTY_IMAGES.md`
