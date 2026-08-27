import { ForecastingAPIResponse } from '@/types/forecasting';
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency';

/**
 * Generate and download CSV report for forecast data
 */
export function generateForecastCSV(
  data: ForecastingAPIResponse,
  propertyName: string,
  startDate: string,
  endDate: string,
  currency?: CurrencyCode
): void {
  try {
    const csv = buildForecastCSV(data, propertyName, startDate, endDate, currency);

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${propertyName.replace(/\s+/g, '_')}_Forecast_Daily_${startDate}_${endDate}.csv`
    );
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV export error:', error);
    throw new Error('Failed to generate CSV: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Build forecast CSV content.
 */
export function buildForecastCSV(
  data: ForecastingAPIResponse,
  propertyName: string,
  startDate: string,
  endDate: string,
  currency?: CurrencyCode
): string {
  const lines: string[] = [];

  // Header section
  lines.push(`"Property","${escapeCsvValue(propertyName)}"`);
  lines.push(`"Report Type","Revenue Forecast"`);
  lines.push(`"Period","${startDate} to ${endDate}"`);
  lines.push(`"Generated","${new Date().toLocaleString()}"`);
  lines.push(''); // Empty line for readability

  // Summary section
  lines.push('"FORECAST SUMMARY"');
  lines.push(`"Period","Projected Revenue${currency ? ` (${currency})` : ''}","Confidence","Confidence Score"`);
  lines.push(`"30 Days","${currency ? formatCurrency(data.forecasts.days30.projectedRevenue, currency) : data.forecasts.days30.projectedRevenue.toFixed(2)}","${data.forecasts.days30.confidenceLevel}","${(data.forecasts.days30.confidenceScore * 100).toFixed(1)}%"`);
  lines.push(`"60 Days","${currency ? formatCurrency(data.forecasts.days60.projectedRevenue, currency) : data.forecasts.days60.projectedRevenue.toFixed(2)}","${data.forecasts.days60.confidenceLevel}","${(data.forecasts.days60.confidenceScore * 100).toFixed(1)}%"`);
  lines.push(`"90 Days","${currency ? formatCurrency(data.forecasts.days90.projectedRevenue, currency) : data.forecasts.days90.projectedRevenue.toFixed(2)}","${data.forecasts.days90.confidenceLevel}","${(data.forecasts.days90.confidenceScore * 100).toFixed(1)}%"`);
  lines.push(''); // Empty line for readability

  // Statistics section
  lines.push('"STATISTICS"');
  lines.push(`"Metric","Value"`);
  lines.push(`"Average Daily Rate (ADR)","${data.assumptions.baseRevenue90Days ? (currency ? formatCurrency(data.assumptions.baseRevenue90Days / 90, currency) : (data.assumptions.baseRevenue90Days / 90).toFixed(2)) : 'N/A'}"`);
  lines.push(`"Average Occupancy Rate","${(data.assumptions.avgOccupancyRate * 100).toFixed(1)}%"`);
  lines.push(`"Last 90 Days Bookings","${data.assumptions.last90DaysBookings}"`);
  lines.push(''); // Empty line for readability

  // Daily forecast data
  lines.push('"DAILY FORECAST DATA"');
  lines.push(`"Date","Projected Revenue${currency ? ` (${currency})` : ''}","Confidence Lower Bound${currency ? ` (${currency})` : ''}","Confidence Upper Bound${currency ? ` (${currency})` : ''}","Confidence Range${currency ? ` (${currency})` : ''}"`);

  // Add daily data points
  data.chartData.forEach((point) => {
    const confidenceRange = point.upper - point.lower;
    lines.push(
      `"${point.date}","${currency ? formatCurrency(point.projected, currency) : point.projected.toFixed(2)}","${currency ? formatCurrency(point.lower, currency) : point.lower.toFixed(2)}","${currency ? formatCurrency(point.upper, currency) : point.upper.toFixed(2)}","${currency ? formatCurrency(confidenceRange, currency) : confidenceRange.toFixed(2)}"`
    );
  });

  lines.push(''); // Empty line for readability

  // Assumptions section
  lines.push('"ASSUMPTIONS & METHODOLOGY"');
  lines.push(`"Seasonal Pattern","${data.assumptions.seasonalPattern ? 'Applied' : 'None'}"`);
  lines.push(`"Day-of-Week Pattern","${data.assumptions.dayOfWeekPattern ? 'Applied' : 'None'}"`);
  lines.push(`"Holiday Events","${data.assumptions.holidayEvents && data.assumptions.holidayEvents.length > 0 ? data.assumptions.holidayEvents.length : 0} events"`);
  lines.push(`"Forecast Description","${escapeCsvValue(data.summary.trendsDescription)}"`);
  lines.push(`"Seasonality Description","${escapeCsvValue(data.summary.seasonalityDescription)}"`);

  return lines.join('\n');
}

/**
 * Escape special characters in CSV values
 */
function escapeCsvValue(value: string): string {
  if (!value) return '';
  // Escape quotes by doubling them
  return value.replace(/"/g, '""');
}

/**
 * Download CSV file from data URL
 */
export function downloadCSVFile(csvContent: string, filename: string): void {
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
