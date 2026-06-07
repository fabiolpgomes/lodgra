import { analyticsRepository, type AnalyticsConfig } from '@/lib/analytics/repository';

/**
 * Get analytics config for tenant
 * @deprecated Use analyticsRepository.getConfig() instead
 */
export async function getAnalyticsConfig(organizationId: string): Promise<AnalyticsConfig | null> {
  return analyticsRepository.getConfig(organizationId);
}

/**
 * Get GA Measurement ID (decrypted)
 * @deprecated Use analyticsRepository.getGAMeasurementId() instead
 */
export async function getGAMeasurementId(organizationId: string): Promise<string | null> {
  return analyticsRepository.getGAMeasurementId(organizationId);
}

/**
 * Create or update analytics config
 * @deprecated Use analyticsRepository.upsertConfig() instead
 */
export async function upsertAnalyticsConfig(
  organizationId: string,
  gaMeasurementId: string
): Promise<AnalyticsConfig> {
  return analyticsRepository.upsertConfig(organizationId, gaMeasurementId);
}

/**
 * Delete analytics config (soft delete)
 * @deprecated Use analyticsRepository.deleteConfig() instead
 */
export async function deleteAnalyticsConfig(organizationId: string): Promise<AnalyticsConfig> {
  return analyticsRepository.deleteConfig(organizationId);
}

/**
 * Log audit event
 * @deprecated Use analyticsRepository.logAuditEvent() instead
 */
export async function logAuditEvent(
  organizationId: string,
  action: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  changedBy: string = 'system',
  ipAddress?: string
): Promise<void> {
  return analyticsRepository.logAuditEvent(organizationId, action, oldValues, newValues, changedBy, ipAddress);
}

/**
 * Get audit log for tenant
 * @deprecated Use analyticsRepository.getAuditLog() instead
 */
export async function getAuditLog(organizationId: string, limit: number = 50) {
  return analyticsRepository.getAuditLog(organizationId, limit);
}

// Export type for backwards compatibility
export type { AnalyticsConfig };
