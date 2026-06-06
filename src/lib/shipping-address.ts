export type ShippingAddressFields = {
  shippingCountry?: string | null;
  shippingRegion?: string | null;
  shippingCity?: string | null;
  shippingAddressLine1?: string | null;
  shippingAddressLine2?: string | null;
  postalCode?: string | null;
  shippingAddress?: string | null;
};

export type NormalizedShippingAddress = {
  shippingCountry: string;
  shippingRegion: string;
  shippingCity: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  postalCode: string;
  shippingAddress: string;
};

export type ShippingAddressValidationResult =
  | { valid: true; address: NormalizedShippingAddress }
  | { valid: false; error: string; address: NormalizedShippingAddress };

export const defaultRequiredShippingAddressFields = [
  'shippingCountry',
  'shippingAddressLine1',
] as const;

function cleanAddressPart(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function hasStructuredAddressInput(fields: ShippingAddressFields): boolean {
  return [
    fields.shippingCountry,
    fields.shippingRegion,
    fields.shippingCity,
    fields.shippingAddressLine1,
    fields.shippingAddressLine2,
  ].some((value) => cleanAddressPart(value));
}

export function normalizeShippingAddress(
  fields: ShippingAddressFields
): NormalizedShippingAddress {
  const legacyAddress = cleanAddressPart(fields.shippingAddress);
  const hasStructuredInput = hasStructuredAddressInput(fields);
  const addressLine1 =
    cleanAddressPart(fields.shippingAddressLine1) || legacyAddress;
  const address: NormalizedShippingAddress = {
    shippingCountry: cleanAddressPart(fields.shippingCountry),
    shippingRegion: cleanAddressPart(fields.shippingRegion),
    shippingCity: cleanAddressPart(fields.shippingCity),
    shippingAddressLine1: addressLine1,
    shippingAddressLine2: cleanAddressPart(fields.shippingAddressLine2),
    postalCode: cleanAddressPart(fields.postalCode),
    shippingAddress: '',
  };

  address.shippingAddress = hasStructuredInput
    ? formatShippingAddress(address)
    : legacyAddress;
  return address;
}

export function formatShippingAddress(fields: ShippingAddressFields): string {
  const normalized = {
    shippingAddressLine1: cleanAddressPart(fields.shippingAddressLine1),
    shippingAddressLine2: cleanAddressPart(fields.shippingAddressLine2),
    shippingCity: cleanAddressPart(fields.shippingCity),
    shippingRegion: cleanAddressPart(fields.shippingRegion),
    postalCode: cleanAddressPart(fields.postalCode),
    shippingCountry: cleanAddressPart(fields.shippingCountry),
  };
  const locality = [
    normalized.shippingCity,
    normalized.shippingRegion,
    normalized.postalCode,
  ]
    .filter(Boolean)
    .join(', ');

  return [
    normalized.shippingAddressLine1,
    normalized.shippingAddressLine2,
    locality,
    normalized.shippingCountry,
  ]
    .filter(Boolean)
    .join('\n');
}

export function validateShippingAddress(
  fields: ShippingAddressFields
): ShippingAddressValidationResult {
  const address = normalizeShippingAddress(fields);
  const hasStructuredInput = hasStructuredAddressInput(fields);

  if (!address.shippingCountry && hasStructuredInput) {
    return {
      valid: false,
      error: 'Please enter the shipping country.',
      address,
    };
  }

  if (!address.shippingAddressLine1) {
    return {
      valid: false,
      error: 'Please enter address line 1.',
      address,
    };
  }

  return { valid: true, address };
}
