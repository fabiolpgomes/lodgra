import { createAdminClient } from '@/lib/supabase/admin';
import { encryptGAId, decryptGAId } from '@/lib/encryption/analytics';

export interface AnalyticsConfig {
  id: string;
  organization_id: string;
  ga_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface AuditLogEntry {
  id: string;
  organization_id: string;
  action: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  changed_by: string;
  ip_address?: string;
  created_at: string;
}

const PGRST_NOT_FOUND = 'PGRST116';

/**
 * AnalyticsRepository - Data access layer for analytics configuration
 * Handles: CRUD operations, encryption, audit logging, error handling
 */
export class AnalyticsRepository {
  private supabase = createAdminClient();

  /**
   * Get analytics config for tenant (basic metadata)
   */
  async getConfig(organizationId: string): Promise<AnalyticsConfig | null> {
    const { data, error } = await this.supabase
      .from('organization_analytics_config')
      .select('id, tenant_id, ga_enabled, created_at, updated_at')
      .eq('tenant_id', organizationId)
      .eq('deleted_at', null)
      .single();

    if (error) {
      if (error.code === PGRST_NOT_FOUND) return null;
      throw this.handleDatabaseError('getConfig', error);
    }

    return data;
  }

  /**
   * Get GA Measurement ID (decrypted)
   * Returns null if not configured, disabled, or decrypt fails
   */
  async getGAMeasurementId(organizationId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('organization_analytics_config')
      .select('ga_measurement_id_encrypted')
      .eq('tenant_id', organizationId)
      .eq('deleted_at', null)
      .eq('ga_enabled', true)
      .single();

    if (error) {
      if (error.code === PGRST_NOT_FOUND) return null;
      throw this.handleDatabaseError('getGAMeasurementId', error);
    }

    try {
      return decryptGAId(Buffer.from(data.ga_measurement_id_encrypted));
    } catch (err) {
      console.error('[Analytics] Decryption failed for tenant:', organizationId, err);
      return null;
    }
  }

  /**
   * Create or update analytics config
   */
  async upsertConfig(organizationId: string, gaMeasurementId: string): Promise<AnalyticsConfig> {
    const encrypted = encryptGAId(gaMeasurementId);

    // Check if exists
    const { data: existing, error: checkError } = await this.supabase
      .from('organization_analytics_config')
      .select('id')
      .eq('tenant_id', organizationId)
      .eq('deleted_at', null)
      .single();

    if (checkError && checkError.code !== PGRST_NOT_FOUND) {
      throw this.handleDatabaseError('upsertConfig (check)', checkError);
    }

    let result: AnalyticsConfig;
    let action: 'created' | 'updated' = 'created';

    if (existing) {
      // Update
      const { data, error } = await this.supabase
        .from('organization_analytics_config')
        .update({
          ga_measurement_id_encrypted: encrypted,
          ga_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', organizationId)
        .select('id, tenant_id, ga_enabled, created_at, updated_at')
        .single();

      if (error) throw this.handleDatabaseError('upsertConfig (update)', error);
      result = data;
      action = 'updated';
    } else {
      // Create
      const { data, error } = await this.supabase
        .from('organization_analytics_config')
        .insert({
          tenant_id: organizationId,
          ga_measurement_id_encrypted: encrypted,
          ga_enabled: true
        })
        .select('id, tenant_id, ga_enabled, created_at, updated_at')
        .single();

      if (error) throw this.handleDatabaseError('upsertConfig (insert)', error);
      result = data;
    }

    // Log audit event
    await this.logAuditEvent(organizationId, action, null, { ga_enabled: true }, 'system');

    return result;
  }

  /**
   * Delete analytics config (soft delete)
   */
  async deleteConfig(organizationId: string): Promise<AnalyticsConfig> {
    const { data, error } = await this.supabase
      .from('organization_analytics_config')
      .update({
        deleted_at: new Date().toISOString(),
        ga_enabled: false
      })
      .eq('tenant_id', organizationId)
      .select('id, tenant_id, ga_enabled, created_at, updated_at')
      .single();

    if (error) throw this.handleDatabaseError('deleteConfig', error);

    // Log audit event
    await this.logAuditEvent(organizationId, 'deleted', { ga_enabled: true }, { ga_enabled: false }, 'system');

    return data;
  }

  /**
   * Log audit event
   */
  async logAuditEvent(
    organizationId: string,
    action: string,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    changedBy: string = 'system',
    ipAddress?: string
  ): Promise<void> {
    const { error } = await this.supabase.from('analytics_config_audit_log').insert({
      tenant_id: organizationId,
      action,
      old_values: oldValues,
      new_values: newValues,
      changed_by: changedBy || 'system',
      ip_address: ipAddress || null
    });

    if (error) {
      console.error('[Analytics] Audit log error:', error);
      // Don't throw - audit logging shouldn't block operations
    }
  }

  /**
   * Get audit log for tenant
   */
  async getAuditLog(organizationId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    const { data, error } = await this.supabase
      .from('analytics_config_audit_log')
      .select('*')
      .eq('tenant_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw this.handleDatabaseError('getAuditLog', error);
    return data || [];
  }

  /**
   * Standardized database error handling
   */
  private handleDatabaseError(operation: string, error: { code?: string; message?: string }): Error {
    console.error(`[Analytics] Database error in ${operation}:`, error);

    if (error.code === PGRST_NOT_FOUND) {
      return new Error(`Configuration not found`);
    }

    if (error.code === '23505') {
      // Unique constraint violation
      return new Error(`Configuration already exists`);
    }

    if (error.code === '42P01') {
      // Table not found
      return new Error(`Database schema issue: table not found`);
    }

    return new Error(`Failed to ${operation}: ${error.message}`);
  }
}

/**
 * Singleton instance
 */
export const analyticsRepository = new AnalyticsRepository();
