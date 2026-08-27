import { BenchmarkReportData } from '@/types/competitor';
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency';

/**
 * Generate and download CSV report for competitor benchmark data
 */
export function generateCompetitorReportCSV(
  reportData: BenchmarkReportData,
  propertyName: string,
  currency?: CurrencyCode
): void {
  try {
    const csv = buildCompetitorReportCSV(reportData, propertyName, currency);

    // Download
    downloadCSVFile(csv, `${propertyName.replace(/\s+/g, '_')}_Competitor_Report_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    console.error('CSV export error:', error);
    throw new Error('Failed to generate CSV: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Build CSV report content for competitor benchmark data.
 */
export function buildCompetitorReportCSV(
  reportData: BenchmarkReportData,
  propertyName: string,
  currency?: CurrencyCode
): string {
  const lines: string[] = [];

  // Header section
  lines.push(`"Property","${escapeCsvValue(propertyName)}"`);
  lines.push(`"Report Type","Competitor Benchmark Report"`);
  lines.push(`"Generated","${new Date().toLocaleString()}"`);
  lines.push('');

  // Market summary section
  lines.push('"MARKET SUMMARY"');
  lines.push(`"Your Price","${currency ? formatCurrency(reportData.property.currentPrice, currency) : reportData.property.currentPrice.toFixed(2)}"`);
  lines.push(`"Market Average","${currency ? formatCurrency(reportData.marketAnalysis.marketAveragePrice, currency) : reportData.marketAnalysis.marketAveragePrice.toFixed(2)}"`);
  lines.push(
    `"Position","${reportData.marketAnalysis.percentageDifference > 0 ? '+' : ''}${reportData.marketAnalysis.percentageDifference.toFixed(1)}%"`
  );
  lines.push(
    `"Market Range","${currency ? formatCurrency(reportData.marketAnalysis.marketRange.min, currency) : reportData.marketAnalysis.marketRange.min.toFixed(2)} - ${currency ? formatCurrency(reportData.marketAnalysis.marketRange.max, currency) : reportData.marketAnalysis.marketRange.max.toFixed(2)}"`
  );
  lines.push('');

  // Recommendation
  lines.push('"RECOMMENDATION"');
  lines.push(`"${escapeCsvValue(reportData.marketAnalysis.recommendation)}"`);
  lines.push('');

  // Competitors detail table
  lines.push('"COMPETITOR DETAILS"');
  lines.push(
    `"Competitor Name","Platform","Current Price","7-Day Change","% Change","Days Monitored"`
  );

  reportData.competitors.forEach((comp) => {
    lines.push(
    `"${escapeCsvValue(comp.competitor.competitorName)}","${comp.competitor.platform}","${comp.currentPrice !== null ? (currency ? formatCurrency(comp.currentPrice, currency) : comp.currentPrice.toFixed(2)) : 'N/A'}","${comp.priceChange7d !== null ? (currency ? formatCurrency(comp.priceChange7d, currency) : comp.priceChange7d.toFixed(2)) : 'N/A'}","${comp.percentageChange7d?.toFixed(1) || 'N/A'}%","${comp.daysMonitored}"`
  );
  });

  return lines.join('\n');
}

/**
 * Escape special characters in CSV values
 */
function escapeCsvValue(value: string): string {
  if (!value) return '';
  return value.replace(/"/g, '""');
}

/**
 * Download CSV file
 */
function downloadCSVFile(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
