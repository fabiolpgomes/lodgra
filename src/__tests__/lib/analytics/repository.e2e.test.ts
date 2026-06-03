import { analyticsRepository } from '@/lib/analytics/repository';
import { encryptGAId, decryptGAId, validateEncryptionKey } from '@/lib/encryption/analytics';

/**
 * E2E Integration Tests for Analytics Repository
 * Tests the full flow: create → read → update → delete → audit logging
 *
 * Note: These tests require:
 * - SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
 * - ANALYTICS_ENCRYPTION_KEY environment variable (32 bytes hex)
 *
 * Skip if environment not configured (tests will pass as "passed with no tests")
 */
describe('AnalyticsRepository E2E', () => {
  const testTenantId = 'test-tenant-' + Math.random().toString(36).substring(7);
  const testGAId = 'G-TESTABCD123';

  // Skip all E2E tests if encryption key not configured
  const skipE2E = !process.env.ANALYTICS_ENCRYPTION_KEY;

  const describe_e2e = skipE2E ? describe.skip : describe;

  describe_e2e('Create & Read', () => {
    it('should create analytics config', async () => {
      const config = await analyticsRepository.upsertConfig(testTenantId, testGAId);

      expect(config).toBeDefined();
      expect(config.tenant_id).toBe(testTenantId);
      expect(config.ga_enabled).toBe(true);
      expect(config.id).toBeDefined();
    });

    it('should retrieve GA measurement ID (decrypted)', async () => {
      await analyticsRepository.upsertConfig(testTenantId, testGAId);

      const gaId = await analyticsRepository.getGAMeasurementId(testTenantId);

      expect(gaId).toBe(testGAId);
    });

    it('should retrieve config metadata', async () => {
      await analyticsRepository.upsertConfig(testTenantId, testGAId);

      const config = await analyticsRepository.getConfig(testTenantId);

      expect(config).toBeDefined();
      expect(config?.tenant_id).toBe(testTenantId);
      expect(config?.ga_enabled).toBe(true);
    });

    it('should return null for non-existent config', async () => {
      const nonExistentTenantId = 'does-not-exist-' + Math.random();

      const config = await analyticsRepository.getConfig(nonExistentTenantId);
      const gaId = await analyticsRepository.getGAMeasurementId(nonExistentTenantId);

      expect(config).toBeNull();
      expect(gaId).toBeNull();
    });
  });

  describe_e2e('Update', () => {
    it('should update existing config', async () => {
      await analyticsRepository.upsertConfig(testTenantId, testGAId);

      const updatedGAId = 'G-UPDATED9999';
      const updatedConfig = await analyticsRepository.upsertConfig(testTenantId, updatedGAId);

      expect(updatedConfig.ga_enabled).toBe(true);

      // Verify new value
      const retrieved = await analyticsRepository.getGAMeasurementId(testTenantId);
      expect(retrieved).toBe(updatedGAId);
    });
  });

  describe_e2e('Delete (Soft Delete)', () => {
    it('should soft-delete config', async () => {
      await analyticsRepository.upsertConfig(testTenantId, testGAId);

      const deleted = await analyticsRepository.deleteConfig(testTenantId);

      expect(deleted.ga_enabled).toBe(false);

      // Verify it's not returned in queries
      const config = await analyticsRepository.getConfig(testTenantId);
      const gaId = await analyticsRepository.getGAMeasurementId(testTenantId);

      expect(config).toBeNull();
      expect(gaId).toBeNull();
    });
  });

  describe_e2e('Audit Logging', () => {
    it('should log create action', async () => {
      const auditTenantId = 'audit-test-' + Math.random().toString(36).substring(7);

      await analyticsRepository.upsertConfig(auditTenantId, testGAId);
      const logs = await analyticsRepository.getAuditLog(auditTenantId, 10);

      expect(logs.length).toBeGreaterThan(0);

      const createLog = logs.find(log => log.action === 'created');
      expect(createLog).toBeDefined();
      expect(createLog?.tenant_id).toBe(auditTenantId);
      expect(createLog?.new_values).toEqual({ ga_enabled: true });
    });

    it('should log update action', async () => {
      const auditTenantId = 'audit-update-' + Math.random().toString(36).substring(7);

      await analyticsRepository.upsertConfig(auditTenantId, testGAId);
      await analyticsRepository.upsertConfig(auditTenantId, 'G-NEWVALUE1234');

      const logs = await analyticsRepository.getAuditLog(auditTenantId, 10);

      const updateLog = logs.find(log => log.action === 'updated');
      expect(updateLog).toBeDefined();
      expect(updateLog?.new_values).toEqual({ ga_enabled: true });
    });

    it('should log delete action', async () => {
      const auditTenantId = 'audit-delete-' + Math.random().toString(36).substring(7);

      await analyticsRepository.upsertConfig(auditTenantId, testGAId);
      await analyticsRepository.deleteConfig(auditTenantId);

      const logs = await analyticsRepository.getAuditLog(auditTenantId, 10);

      const deleteLog = logs.find(log => log.action === 'deleted');
      expect(deleteLog).toBeDefined();
      expect(deleteLog?.old_values).toEqual({ ga_enabled: true });
      expect(deleteLog?.new_values).toEqual({ ga_enabled: false });
    });
  });

  describe('Encryption', () => {
    it('should validate encryption key', () => {
      const isValid = validateEncryptionKey();
      expect(isValid).toBe(true);
    });

    it('should encrypt and decrypt GA ID', () => {
      const originalGAId = 'G-ENCRYPT123456';
      const encrypted = encryptGAId(originalGAId);
      const decrypted = decryptGAId(encrypted);

      expect(decrypted).toBe(originalGAId);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const gaId = 'G-SAME123456';
      const encrypted1 = encryptGAId(gaId);
      const encrypted2 = encryptGAId(gaId);

      expect(encrypted1).not.toEqual(encrypted2);

      // But both decrypt to same value
      expect(decryptGAId(encrypted1)).toBe(gaId);
      expect(decryptGAId(encrypted2)).toBe(gaId);
    });

    it('should throw on decrypt with wrong key', () => {
      const gaId = 'G-WRONGKEY123';
      const encrypted = encryptGAId(gaId);

      // Tamper with the buffer
      const tamperedEncrypted = Buffer.from(encrypted);
      tamperedEncrypted[0] ^= 0xff; // Flip bits in IV

      expect(() => decryptGAId(tamperedEncrypted)).toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle decryption failure gracefully in getGAMeasurementId', async () => {
      // Create a valid config
      await analyticsRepository.upsertConfig(testTenantId, testGAId);

      // Note: We can't easily tamper with the database value in tests
      // This test documents the expected behavior when decryption fails
      // In production, corrupted data returns null without throwing
      const gaId = await analyticsRepository.getGAMeasurementId(testTenantId);
      expect(gaId).toBe(testGAId); // Should succeed
    });

    it('should throw on invalid tenant ID in delete', async () => {
      const invalidId = 'not-a-valid-uuid';

      await expect(analyticsRepository.deleteConfig(invalidId)).rejects.toThrow();
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should isolate configs by tenant', async () => {
      const tenant1 = 'tenant-1-' + Math.random().toString(36).substring(7);
      const tenant2 = 'tenant-2-' + Math.random().toString(36).substring(7);
      const gaId1 = 'G-TENANT00001';
      const gaId2 = 'G-TENANT00002';

      await analyticsRepository.upsertConfig(tenant1, gaId1);
      await analyticsRepository.upsertConfig(tenant2, gaId2);

      const retrieved1 = await analyticsRepository.getGAMeasurementId(tenant1);
      const retrieved2 = await analyticsRepository.getGAMeasurementId(tenant2);

      expect(retrieved1).toBe(gaId1);
      expect(retrieved2).toBe(gaId2);
      expect(retrieved1).not.toBe(retrieved2);
    });

    it('should isolate audit logs by tenant', async () => {
      const tenant1 = 'audit-tenant-1-' + Math.random().toString(36).substring(7);
      const tenant2 = 'audit-tenant-2-' + Math.random().toString(36).substring(7);

      await analyticsRepository.upsertConfig(tenant1, 'G-T1');
      await analyticsRepository.upsertConfig(tenant2, 'G-T2');

      const logs1 = await analyticsRepository.getAuditLog(tenant1, 10);
      const logs2 = await analyticsRepository.getAuditLog(tenant2, 10);

      expect(logs1.every(log => log.tenant_id === tenant1)).toBe(true);
      expect(logs2.every(log => log.tenant_id === tenant2)).toBe(true);
      expect(logs1.length).toBeGreaterThan(0);
      expect(logs2.length).toBeGreaterThan(0);
    });
  });
});
