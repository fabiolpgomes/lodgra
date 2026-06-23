#!/usr/bin/env node

/**
 * Seed Cleaning Templates Script
 * Populates database with 3 standard cleaning templates (A, B, C)
 *
 * Usage:
 *   npx ts-node scripts/seed-cleaning-templates.ts
 */

import fetch from 'node-fetch';

const SEED_URL = 'http://localhost:3000/api/cleaning/templates/seed';

async function seedTemplates() {
  console.log('🧹 Starting Cleaning Templates Seeding...\n');

  try {
    // Call seed endpoint
    const response = await fetch(SEED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Note: In production, you'll need to pass auth headers
      // This assumes the endpoint is called with authenticated context
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Seed failed:', error);
      process.exit(1);
    }

    const result = (await response.json()) as {
      success: boolean;
      message?: string;
      error?: string;
      results?: Array<{
        name: string;
        status: 'created' | 'skipped';
        reason?: string;
        itemCount?: number;
        templateId?: string;
      }>;
    };

    if (result.success) {
      console.log('✅ Seeding completed successfully!\n');
      console.log('Templates created:');
      result.results?.forEach((r) => {
        if (r.status === 'created') {
          console.log(
            `  ✅ ${r.name}`
          );
          console.log(`     Items: ${r.itemCount}`);
        } else if (r.status === 'skipped') {
          console.log(
            `  ⏭️  ${r.name} (${r.reason})`
          );
        }
      });
    } else {
      console.error('❌ Seeding failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

// Run
seedTemplates();
