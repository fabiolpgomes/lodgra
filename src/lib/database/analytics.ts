import { createAdminClient } from '@/lib/supabase/admin';
import { encryptGAId, decryptGAId } from '@/lib/encryption/analytics';

interface AnalyticsConfig {
  id: string;
  tenant_id: string;
  ga_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get analytics config for tenant
 */
export async function getAnalyticsConfig(tenantId: string): Promise<AnalyticsConfig | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('tenant_analytics_config')
    .select('id, tenant_id, ga_enabled, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .eq('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Get GA Measurement ID (decrypted)
 */
export async function getGAMeasurementId(tenantId: string): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('tenant_analytics_config')
    .select('ga_measurement_id_encrypted')
    .eq('tenant_id', tenantId)
    .eq('deleted_at', null)
    .eq('ga_enabled', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  try {
    const decrypted = decryptGAId(Buffer.from(data.ga_measurement_id_encrypted));
    return decrypted;
  } catch (e) {
    console.error('[Analytics] Decryption failed:', e);
    return null;
  }
}

/**
 * Create or update analytics config
 */
export async function upsertAnalyticsConfig(
  tenantId: string,
  gaMeasurementId: string
): Promise<AnalyticsConfig> {
  const supabase = createAdminClient();

  // Encrypt GA ID
  const encrypted = encryptGAId(gaMeasurementId);

  // Check if exists
  const { data: existing } = await supabase
    .from('tenant_analytics_config')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('deleted_at', null)
    .single();

  let result;
  let action: 'created' | 'updated' = 'created';

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('tenant_analytics_config')
      .update({
        ga_measurement_id_encrypted: encrypted,
        ga_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .select('id, tenant_id, ga_enabled, created_at, updated_at')
      .single();

    if (error) throw error;
    result = data;
    action = 'updated';
  } else {
    // Create
    const { data, error } = await supabase
      .from('tenant_analytics_config')
      .insert({
        tenant_id: tenantId,
        ga_measurement_id_encrypted: encrypted,
        ga_enabled: true
      })
      .select('id, tenant_id, ga_enabled, created_at, updated_at')
      .single();

    if (error) throw error;
    result = data;
  }

  // Log audit event
  await logAuditEvent(tenantId, action, null, { ga_enabled: true }, 'system');

  return result;
}

/**
 * Delete analytics config (soft delete)
 */
export async function deleteAnalyticsConfig(tenantId: string): Promise<AnalyticsConfig> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('tenant_analytics_config')
    .update({
      deleted_at: new Date().toISOString(),
      ga_enabled: false
    })
    .eq('tenant_id', tenantId)
    .select('id, tenant_id, ga_enabled, created_at, updated_at')
    .single();

  if (error) throw error;

  // Log audit event
  await logAuditEvent(tenantId, 'deleted', { ga_enabled: true }, { ga_enabled: false }, 'system');

  return data;
}

/**
 * Log audit event
 */
export async function logAuditEvent(
  tenantId: string,
  action: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  changedBy: string = 'system',
  ipAddress?: string
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('analytics_config_audit_log').insert({
    tenant_id: tenantId,
    action,
    old_values: oldValues,
    new_values: newValues,
    changed_by: changedBy,
    ip_address: ipAddress
  });
}

/**
 * Get audit log for tenant
 */
export async function getAuditLog(tenantId: string, limit: number = 50) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('analytics_config_audit_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
