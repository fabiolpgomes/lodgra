/**
 * Format property address for WhatsApp messages
 * Used in all templates: lodgra_task_assigned, lodgra_checkin_code, etc.
 *
 * Format: {address}, {city} {postal_code}
 * Example: "Rua da Praia 123, Lagoa 8135-068"
 */

export interface PropertyAddress {
  address: string;
  city: string;
  postal_code: string;
}

export function formatPropertyAddress(prop: PropertyAddress): string {
  const parts = [prop.address, `${prop.city} ${prop.postal_code}`.trim()].filter(Boolean);
  return parts.join(', ');
}

/**
 * Validate that address has all required fields
 */
export function isAddressValid(prop: Partial<PropertyAddress>): prop is PropertyAddress {
  return !!(prop.address?.trim() && prop.city?.trim() && prop.postal_code?.trim());
}

/**
 * Clean and normalize address fields
 */
export function normalizeAddress(prop: Partial<PropertyAddress>): PropertyAddress | null {
  if (!isAddressValid(prop)) {
    return null;
  }

  return {
    address: prop.address.trim(),
    city: prop.city.trim(),
    postal_code: prop.postal_code.trim(),
  };
}
