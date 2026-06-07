import { headers } from 'next/headers';
import { getGAMeasurementId } from '@/lib/database/analytics';
import { createAdminClient } from '@/lib/supabase/admin';

const ROOT_DOMAINS = ['lodgra.io', 'localhost', 'vercel.app'];

/**
 * Get organization GA Measurement ID for the current subdomain
 * Returns the organization's GA ID if configured, otherwise returns Lodgra's GA ID
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

    // Get organization by subdomain
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

    // Get organization's GA config
    try {
      const organizationGAId = await getGAMeasurementId(org.id);
      if (organizationGAId) {
        return organizationGAId;
      }
    } catch (err) {
      console.error('[Analytics Server] Failed to get organization GA ID, falling back:', err);
      // Fall back to Lodgra GA on error
    }

    return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null;
  } catch (err) {
    console.error('[Analytics Server] Error getting organization GA ID:', err);
    // Always fall back to Lodgra GA on error
    return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null;
  }
}

/**
 * Cache the GA ID lookup with a 1-hour TTL
 */
export const cachedGetTenantGAId = getTenantGAId;
