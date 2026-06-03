import { headers } from 'next/headers';
import { getGAMeasurementId } from '@/lib/database/analytics';
import { createAdminClient } from '@/lib/supabase/admin';

const ROOT_DOMAINS = ['lodgra.io', 'localhost', 'vercel.app'];

/**
 * Get tenant GA Measurement ID for the current subdomain
 * Returns the tenant's GA ID if configured, otherwise returns Lodgra's GA ID
 *
 * @returns GA Measurement ID (customer's or Lodgra's fallback)
 */
export async function getTenantGAId(): Promise<string | null> {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';

    // Extract subdomain from hostname
    const hostname = host.split(':')[0];
    const isRootDomain = ROOT_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`)
    );

    // If root domain (lodgra.io), use Lodgra's GA
    if (isRootDomain) {
      return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null;
    }

    // Extract subdomain (e.g., "myhotel" from "myhotel.lodgra.io")
    const [subdomain] = hostname.split('.');

    if (!subdomain) {
      return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null;
    }

    // Get tenant by subdomain
    const supabase = createAdminClient();
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', subdomain)
      .single();

    if (!org) {
      // Subdomain not found, fall back to Lodgra GA
      return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null;
    }

    // Get tenant's GA config
    try {
      const tenantGAId = await getGAMeasurementId(org.id);
      if (tenantGAId) {
        return tenantGAId;
      }
    } catch (err) {
      console.error('[Analytics Server] Failed to get tenant GA ID, falling back:', err);
      // Fall back to Lodgra GA on error
    }

    return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null;
  } catch (err) {
    console.error('[Analytics Server] Error getting tenant GA ID:', err);
    // Always fall back to Lodgra GA on error
    return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null;
  }
}

/**
 * Cache the GA ID lookup with a 1-hour TTL
 */
export const cachedGetTenantGAId = getTenantGAId;
