import { ForecastingAPIResponse, RevenueForecast } from '@/types/forecasting';

/**
 * Generate PDF report for forecast data
 * Uses dynamic HTML-to-PDF conversion via browser canvas
 */
export async function generateForecastPDF(
  data: ForecastingAPIResponse,
  propertyName: string,
  startDate: string,
  endDate: string
): Promise<void> {
  try {
    // Create a temporary container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '800px';
    container.style.backgroundColor = 'white';
    container.style.padding = '40px';
    container.style.fontFamily = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';

    // Build HTML content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <!-- Header -->
        <div style="border-bottom: 2px solid #1f2937; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px; color: #1f2937;">${propertyName}</h1>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Revenue Forecast Report</p>
          <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">${startDate} to ${endDate}</p>
        </div>

        <!-- Forecast Summary Cards -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; margin-bottom: 15px; color: #1f2937;">Forecast Summary</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            ${generateForecastCardHTML(data.forecasts.days30, '30 Days')}
            ${generateForecastCardHTML(data.forecasts.days60, '60 Days')}
            ${generateForecastCardHTML(data.forecasts.days90, '90 Days')}
          </div>
        </div>

        <!-- Statistics Section -->
        <div style="margin-bottom: 30px; page-break-inside: avoid;">
          <h2 style="font-size: 18px; margin-bottom: 15px; color: #1f2937;">Key Statistics</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-weight: bold; color: #4b5563;">Average Daily Rate (ADR)</td>
                <td style="padding: 10px; text-align: right;">€${data.assumptions.baseRevenue90Days ? (data.assumptions.baseRevenue90Days / 90).toFixed(2) : 'N/A'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-weight: bold; color: #4b5563;">Confidence Score</td>
                <td style="padding: 10px; text-align: right;">${(data.assumptions.last90DaysBookings > 0 ? 'High' : 'Low')}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-weight: bold; color: #4b5563;">Occupancy Rate Forecast (30D)</td>
                <td style="padding: 10px; text-align: right;">${data.forecasts.days30.occupancyRateForecast ? (data.forecasts.days30.occupancyRateForecast * 100).toFixed(1) : 'N/A'}%</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; color: #4b5563;">Trend</td>
                <td style="padding: 10px; text-align: right;">${data.summary.trendsDescription}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Daily Breakdown Table -->
        <div style="margin-bottom: 30px; page-break-inside: avoid;">
          <h2 style="font-size: 18px; margin-bottom: 15px; color: #1f2937;">Daily Forecast Breakdown</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db;">
                <th style="padding: 10px; text-align: left; font-weight: bold;">Date</th>
                <th style="padding: 10px; text-align: right; font-weight: bold;">Projected Revenue</th>
                <th style="padding: 10px; text-align: center; font-weight: bold;">Confidence</th>
              </tr>
            </thead>
            <tbody>
              ${data.chartData.slice(0, 30).map((point, idx) => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px; text-align: left;">${point.date}</td>
                  <td style="padding: 8px; text-align: right;">€${point.projected.toFixed(2)}</td>
                  <td style="padding: 8px; text-align: center;">±${((point.upper - point.lower) / 2).toFixed(0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Methodology -->
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 30px;">
          <h3 style="margin-top: 0; font-size: 16px; color: #1f2937;">Forecast Methodology</h3>
          <p style="margin: 10px 0; color: #6b7280; font-size: 13px;">
            ${data.assumptions.analysisDate ? `This forecast is based on analysis from ${data.assumptions.analysisDate}, using ` : 'This forecast is based on '}
            historical booking data (last ${data.assumptions.last90DaysBookings} bookings) combined with seasonal adjustments and market trends.
          </p>
          <p style="margin: 10px 0; color: #6b7280; font-size: 13px;">
            Key factors: Seasonal patterns, day-of-week variations, holiday events, and base pricing strategy.
          </p>
        </div>

        <!-- Recommendations -->
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 16px; margin-bottom: 10px; color: #1f2937;">Recommendations</h3>
          <ul style="padding-left: 20px; color: #6b7280; font-size: 13px;">
            ${data.summary.recommendations.map(rec => `<li style="margin-bottom: 8px;">${rec}</li>`).join('')}
          </ul>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 11px; color: #9ca3af;">
          <p style="margin: 5px 0;">Generated on ${new Date().toLocaleString()}</p>
          <p style="margin: 5px 0; line-height: 1.5;">
            This forecast is based on historical data analysis and may not account for unforeseen market changes,
            regulatory changes, or extraordinary events. Use this for planning purposes only.
          </p>
        </div>
      </div>
    `;

    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // Dynamically import html2canvas and jsPDF (to avoid breaking if not installed)
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).jsPDF;

      // Convert HTML to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download
      const filename = `${propertyName.replace(/\s+/g, '_')}_Forecast_${startDate}_${endDate}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('PDF generation error:', error);
      // Fallback: Create simple PDF with text only
      const fallbackPDF = await createFallbackPDF(data, propertyName, startDate, endDate);
      const link = document.createElement('a');
      link.href = fallbackPDF;
      link.download = `${propertyName.replace(/\s+/g, '_')}_Forecast_${startDate}_${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Cleanup
    document.body.removeChild(container);
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error('Failed to generate PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Fallback PDF generation using text only
 */
async function createFallbackPDF(
  data: ForecastingAPIResponse,
  propertyName: string,
  startDate: string,
  endDate: string
): Promise<string> {
  // Create a canvas with text-based content
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create canvas context');

  canvas.width = 800;
  canvas.height = 600;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 28px Arial';
  ctx.fillText(propertyName, 40, 60);

  ctx.font = '14px Arial';
  ctx.fillStyle = '#6b7280';
  ctx.fillText(`Revenue Forecast Report`, 40, 90);
  ctx.fillText(`${startDate} to ${endDate}`, 40, 110);

  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#1f2937';
  ctx.fillText('30-Day Forecast: €' + data.forecasts.days30.projectedRevenue.toFixed(2), 40, 160);
  ctx.fillText('60-Day Forecast: €' + data.forecasts.days60.projectedRevenue.toFixed(2), 40, 190);
  ctx.fillText('90-Day Forecast: €' + data.forecasts.days90.projectedRevenue.toFixed(2), 40, 220);

  ctx.font = 'italic 12px Arial';
  ctx.fillStyle = '#9ca3af';
  const genDate = new Date().toLocaleString();
  ctx.fillText(`Generated: ${genDate}`, 40, 550);

  return canvas.toDataURL('image/png');
}

/**
 * Helper function to generate forecast card HTML
 */
function generateForecastCardHTML(forecast: RevenueForecast, period: string): string {
  const confidenceColor = {
    high: '#10b981',
    medium: '#f59e0b',
    low: '#ef4444',
  }[forecast.confidenceLevel];

  return `
    <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; background-color: #f9fafb;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #4b5563;">${period}</p>
      <p style="margin: 0 0 10px 0; font-size: 24px; font-weight: bold; color: #1f2937;">€${forecast.projectedRevenue.toFixed(2)}</p>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">Confidence: <span style="color: ${confidenceColor}; font-weight: bold;">${forecast.confidenceLevel.toUpperCase()} (${(forecast.confidenceScore * 100).toFixed(0)}%)</span></p>
    </div>
  `;
}
