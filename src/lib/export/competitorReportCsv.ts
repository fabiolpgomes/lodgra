import { BenchmarkReportData } from '@/types/competitor';

/**
 * Generate and download CSV report for competitor benchmark data
 */
export function generateCompetitorReportCSV(
  reportData: BenchmarkReportData,
  propertyName: string
): void {
  try {
    const lines: string[] = [];

    // Header section
    lines.push(`"Property","${escapeCsvValue(propertyName)}"`);
    lines.push(`"Report Type","Competitor Benchmark Report"`);
    lines.push(`"Generated","${new Date().toLocaleString()}"`);
    lines.push('');

    // Market summary section
    lines.push('"MARKET SUMMARY"');
    lines.push(`"Your Price","€${reportData.property.currentPrice.toFixed(2)}"`);
    lines.push(`"Market Average","€${reportData.marketAnalysis.marketAveragePrice.toFixed(2)}"`);
    lines.push(
      `"Position","${reportData.marketAnalysis.percentageDifference > 0 ? '+' : ''}${reportData.marketAnalysis.percentageDifference.toFixed(1)}%"`
    );
    lines.push(`"Market Range","€${reportData.marketAnalysis.marketRange.min.toFixed(2)} - €${reportData.marketAnalysis.marketRange.max.toFixed(2)}"`);
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
        `"${escapeCsvValue(comp.competitor.competitorName)}","${comp.competitor.platform}","€${comp.currentPrice?.toFixed(2) || 'N/A'}","€${comp.priceChange7d?.toFixed(2) || 'N/A'}","${comp.percentageChange7d?.toFixed(1) || 'N/A'}%","${comp.daysMonitored}"`
      );
    });

    // Join and create CSV
    const csv = lines.join('\n');

    // Download
    downloadCSVFile(csv, `${propertyName.replace(/\s+/g, '_')}_Competitor_Report_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    console.error('CSV export error:', error);
    throw new Error('Failed to generate CSV: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
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
