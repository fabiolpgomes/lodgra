/**
 * Story 36.7: CSV Export Utility
 * Format and export price history to CSV format
 */

import { PriceHistory } from '@/types/pricing.types';

/**
 * Escape CSV special characters
 * @param value Value to escape
 * @returns Escaped value safe for CSV
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';

  const stringValue = String(value);

  // If value contains comma, quotes, or newline, wrap in quotes and escape inner quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert price history to CSV string
 * @param history Price history records
 * @param currency Currency symbol (default: €)
 * @returns CSV string with header and data rows
 */
export function convertToCsv(
  history: PriceHistory[],
  currency: string = '€'
): string {
  if (history.length === 0) {
    return 'Date Applied,Price,Changed By,Reason,Status\n';
  }

  const headers = ['Date Applied', 'Price', 'Changed By', 'Reason', 'Status'];
  const rows: string[] = [];

  // Add header row
  rows.push(headers.map((h) => escapeCsvValue(h)).join(','));

  // Add data rows
  history.forEach((record) => {
    const cells = [
      record.date_applied,
      `${currency} ${record.price.toFixed(2)}`,
      record.changed_by,
      record.change_reason || 'N/A',
      record.is_revert ? 'Reverted' : 'Active',
    ];

    rows.push(cells.map((c) => escapeCsvValue(c)).join(','));
  });

  return rows.join('\n');
}

/**
 * Convert price history to CSV with extended details
 * @param history Price history records
 * @param currency Currency symbol (default: €)
 * @returns CSV string with extended information
 */
export function convertToCsvExtended(
  history: PriceHistory[],
  currency: string = '€'
): string {
  if (history.length === 0) {
    return 'Date Applied,Time,Price,Previous Price,Change %,Changed By,Reason,Type\n';
  }

  const headers = [
    'Date Applied',
    'Time',
    'Price',
    'Previous Price',
    'Change %',
    'Changed By',
    'Reason',
    'Type',
  ];
  const rows: string[] = [];

  // Add header row
  rows.push(headers.map((h) => escapeCsvValue(h)).join(','));

  // Add data rows with calculation of previous price
  history.forEach((record, index) => {
    const previousRecord = index < history.length - 1 ? history[index + 1] : null;
    const previousPrice = previousRecord ? previousRecord.price : record.price;
    const changePercent =
      previousPrice > 0
        ? (((record.price - previousPrice) / previousPrice) * 100).toFixed(2)
        : '0.00';

    const timestamp = new Date(record.created_at);
    const time = timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const cells = [
      record.date_applied,
      time,
      `${currency} ${record.price.toFixed(2)}`,
      previousPrice > 0 ? `${currency} ${previousPrice.toFixed(2)}` : 'N/A',
      `${changePercent}%`,
      record.changed_by,
      record.change_reason || 'N/A',
      record.is_revert ? 'Revert' : 'Update',
    ];

    rows.push(cells.map((c) => escapeCsvValue(c)).join(','));
  });

  return rows.join('\n');
}

/**
 * Export price history to CSV file
 * @param history Price history records
 * @param propertyId Property ID for filename
 * @param extended Whether to include extended details
 */
export function exportCsvFile(
  history: PriceHistory[],
  propertyId: string,
  extended: boolean = false
): void {
  const csv = extended ? convertToCsvExtended(history) : convertToCsv(history);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `price-history-${propertyId}-${timestamp}${extended ? '-extended' : ''}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parse CSV string back to objects
 * @param csv CSV string
 * @returns Parsed records
 */
export function parseCSV(
  csv: string
): Array<{
  dateApplied: string;
  price: number;
  changedBy: string;
  reason?: string;
  status: string;
}> {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];

  const records = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (doesn't handle all edge cases, use csv-parser for production)
    const parts = line.split(',').map((p) => p.trim());

    if (parts.length >= 5) {
      const priceMatch = parts[1]?.match(/[\d.]+/);
      records.push({
        dateApplied: parts[0],
        price: priceMatch ? parseFloat(priceMatch[0]) : 0,
        changedBy: parts[2],
        reason: parts[3] !== 'N/A' ? parts[3] : undefined,
        status: parts[4],
      });
    }
  }

  return records;
}
