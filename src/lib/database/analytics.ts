import { analyticsRepository, type AnalyticsConfig } from '@/lib/analytics/repository';

/**
 * Get analytics config for tenant
 * @deprecated Use analyticsRepository.getConfig() instead
 */
export async function getAnalyticsConfig(tenantId: string): Promise<AnalyticsConfig | null> {
  return analyticsRepository.getConfig(tenantId);
}

/**
 * Get GA Measurement ID (decrypted)
 * @deprecated Use analyticsRepository.getGAMeasurementId() instead
 */
export async function getGAMeasurementId(tenantId: string): Promise<string | null> {
  return analyticsRepository.getGAMeasurementId(tenantId);
}

/**
 * Create or update analytics config
 * @deprecated Use analyticsRepository.upsertConfig() instead
 */
export async function upsertAnalyticsConfig(
  tenantId: string,
  gaMeasurementId: string
): Promise<AnalyticsConfig> {
  return analyticsRepository.upsertConfig(tenantId, gaMeasurementId);
}

/**
 * Delete analytics config (soft delete)
 * @deprecated Use analyticsRepository.deleteConfig() instead
 */
export async function deleteAnalyticsConfig(tenantId: string): Promise<AnalyticsConfig> {
  return analyticsRepository.deleteConfig(tenantId);
}

/**
 * Log audit event
 * @deprecated Use analyticsRepository.logAuditEvent() instead
 */
export async function logAuditEvent(
  tenantId: string,
  action: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  changedBy: string = 'system',
  ipAddress?: string
): Promise<void> {
  return analyticsRepository.logAuditEvent(tenantId, action, oldValues, newValues, changedBy, ipAddress);
}

/**
 * Get audit log for tenant
 * @deprecated Use analyticsRepository.getAuditLog() instead
 */
export async function getAuditLog(tenantId: string, limit: number = 50) {
  return analyticsRepository.getAuditLog(tenantId, limit);
}

// Export type for backwards compatibility
export type { AnalyticsConfig };
