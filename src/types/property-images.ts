/**
 * Shared types for property images and variants
 */

export interface ImageVariant {
  id?: string;
  property_image_id?: string;
  variant_type: 'thumb' | 'mobile' | 'tablet' | 'desktop' | 'original';
  storage_path: string;
  width: number;
  height: number;
  file_size_bytes?: number;
  format: 'webp' | 'jpeg';
  created_at?: string;
  updated_at?: string;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  organization_id?: string;
  original_filename: string;
  alt_text?: string | null;
  width: number;
  height: number;
  file_size_bytes?: number;
  display_order: number;
  is_primary: boolean;
  mime_type?: string;
  uploaded_by?: string;
  storage_path?: string;
  storagePath?: string; // Alias for storage_path used in responses
  variants?: ImageVariant[];
  created_at?: string;
  updated_at?: string;
}
