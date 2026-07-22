/**
 * Cron API Endpoint
 * Handles background job triggers for competitor scraping, alerts, and cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
import { CompetitorPriceScraper } from '@/jobs/competitorPriceScraper';
import { AlertGenerator } from '@/jobs/alertGenerator';

/**
 * GET handler for cron jobs
 * Query parameters:
 *   - job: 'scrape' | 'alerts' | 'cleanup'
 */
export async function GET(request: NextRequest | any) {
  // Handle both NextRequest and test Request objects
  const url = new URL(
    request.url || request._url || `http://localhost${request.url || '/'}`
  );
  const searchParams = url.searchParams;

  // Extract auth header from either NextRequest or test Request
  let authHeader = '';
  if (request.headers) {
    if (typeof request.headers.get === 'function') {
      authHeader = request.headers.get('authorization') || '';
    } else {
      // Handle plain object headers (from test Request)
      authHeader = request.headers.authorization || request.headers.Authorization || '';
    }
  }

  const job = searchParams.get('job');

  // Verify API key
  const cronSecret = process.env.CRON_SECRET;
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate job parameter
  const validJobs = ['scrape', 'alerts', 'cleanup'];
  if (!job || !validJobs.includes(job)) {
    return NextResponse.json({ error: 'Invalid job parameter' }, { status: 400 });
  }

  try {
    let result;

    switch (job) {
      case 'scrape':
        result = await CompetitorPriceScraper.run();
        return NextResponse.json(result);

      case 'alerts':
        result = await AlertGenerator.run();
        return NextResponse.json(result);

      case 'cleanup':
        // Placeholder for cleanup job
        result = {
          cleaned: 0,
          timestamp: new Date().toISOString(),
        };
        return NextResponse.json(result);

      default:
        return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`[Cron] Job ${job} failed:`, error);
    return NextResponse.json(
      { error: `Job execution failed: ${error.message}` },
      { status: 500 }
    );
  }
}
