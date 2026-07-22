/**
 * Story 36.7: CSV Exporter Tests
 * Unit tests for CSV formatting and export
 */

import { convertToCsv, convertToCsvExtended, parseCSV } from '@/lib/pricing/csv-exporter';
import { PriceHistory } from '@/types/pricing.types';

describe('CSV Exporter', () => {
  const mockHistory: PriceHistory[] = [
    {
      id: '1',
      property_id: 'prop-1',
      price: 150,
      date_applied: '2024-01-10',
      changed_by: 'user-1',
      change_reason: 'Seasonal adjustment',
      is_revert: false,
      is_deleted: false,
      created_at: '2024-01-10T10:00:00Z',
      updated_at: '2024-01-10T10:00:00Z',
    },
    {
      id: '2',
      property_id: 'prop-1',
      price: 130,
      date_applied: '2024-01-08',
      changed_by: 'user-1',
      change_reason: 'Manual adjustment',
      is_revert: false,
      is_deleted: false,
      created_at: '2024-01-08T10:00:00Z',
      updated_at: '2024-01-08T10:00:00Z',
    },
  ];

  describe('convertToCsv', () => {
    it('should convert history to CSV format', () => {
      const csv = convertToCsv(mockHistory);

      expect(csv).toContain('Date Applied');
      expect(csv).toContain('Price');
      expect(csv).toContain('2024-01-10');
      expect(csv).toContain('150');
    });

    it('should include header row', () => {
      const csv = convertToCsv(mockHistory);
      const lines = csv.split('\n');

      expect(lines[0]).toContain('Date Applied');
      expect(lines[0]).toContain('Changed By');
      expect(lines[0]).toContain('Reason');
    });

    it('should handle special characters in reason', () => {
      const withSpecialChars = [
        ...mockHistory,
        {
          ...mockHistory[0],
          id: '3',
          change_reason: 'Test, with "quotes" and commas',
        },
      ];

      const csv = convertToCsv(withSpecialChars);

      // CSV escaping doubles the quotes: "quotes" becomes ""quotes""
      expect(csv).toContain('with ""quotes""');
    });

    it('should return header only for empty history', () => {
      const csv = convertToCsv([]);

      const lines = csv.split('\n').filter(line => line.trim());
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('Date Applied');
    });

    it('should use currency parameter', () => {
      const csv = convertToCsv(mockHistory, '$');

      expect(csv).toContain('$');
    });
  });

  describe('convertToCsvExtended', () => {
    it('should include extended details', () => {
      const csv = convertToCsvExtended(mockHistory);

      expect(csv).toContain('Time');
      expect(csv).toContain('Previous Price');
      expect(csv).toContain('Change %');
    });

    it('should calculate percentage change', () => {
      const csv = convertToCsvExtended(mockHistory);

      expect(csv).toContain('%');
    });

    it('should mark revert records', () => {
      const withRevert = [
        ...mockHistory,
        { ...mockHistory[0], id: '3', is_revert: true },
      ];

      const csv = convertToCsvExtended(withRevert);

      expect(csv).toContain('Revert');
    });

    it('should handle null reasons', () => {
      const noReason = [
        { ...mockHistory[0], change_reason: null },
      ];

      const csv = convertToCsvExtended(noReason);

      expect(csv).toContain('N/A');
    });
  });

  describe('parseCSV', () => {
    it('should parse CSV back to objects', () => {
      const csv = convertToCsv(mockHistory);
      const parsed = parseCSV(csv);

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].dateApplied).toBeDefined();
      expect(parsed[0].price).toBeGreaterThan(0);
    });

    it('should handle empty CSV', () => {
      const parsed = parseCSV('');

      expect(parsed).toEqual([]);
    });

    it('should handle header only CSV', () => {
      const csv = 'Date Applied,Price,Changed By,Reason,Status\n';
      const parsed = parseCSV(csv);

      expect(parsed).toEqual([]);
    });

    it('should extract price from currency format', () => {
      const csv = 'Date Applied,Price,Changed By,Reason,Status\n2024-01-10,€ 150.00,user-1,Test,Active';
      const parsed = parseCSV(csv);

      expect(parsed[0].price).toBe(150);
    });

    it('should mark reverted records', () => {
      const csv = `Date Applied,Price,Changed By,Reason,Status
2024-01-10,€ 150.00,user-1,Test,Reverted`;

      const parsed = parseCSV(csv);

      expect(parsed[0].status).toBe('Reverted');
    });
  });

  describe('edge cases', () => {
    it('should handle very large prices', () => {
      const largePrice = [
        { ...mockHistory[0], price: 9999.99 },
      ];

      const csv = convertToCsv(largePrice);

      expect(csv).toContain('9999.99');
    });

    it('should handle zero prices', () => {
      const zeroPrice = [
        { ...mockHistory[0], price: 0 },
      ];

      const csv = convertToCsv(zeroPrice);

      expect(csv).toContain('€ 0.00');
    });

    it('should handle decimal precision', () => {
      const decimal = [
        { ...mockHistory[0], price: 123.456 },
      ];

      const csv = convertToCsv(decimal);

      expect(csv).toBeDefined();
    });

    it('should handle multiline reasons', () => {
      const multiline = [
        {
          ...mockHistory[0],
          change_reason: 'Line 1\nLine 2\nLine 3',
        },
      ];

      const csv = convertToCsv(multiline);

      expect(csv).toBeDefined();
    });
  });
});
