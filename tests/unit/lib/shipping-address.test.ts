import { describe, expect, it } from 'vitest';
import {
  formatShippingAddress,
  normalizeShippingAddress,
  validateShippingAddress,
} from '@/lib/shipping-address';

describe('shipping-address helpers', () => {
  it('formats structured international addresses without country-specific rules', () => {
    const address = normalizeShippingAddress({
      shippingCountry: 'Germany',
      shippingRegion: 'Berlin',
      shippingCity: 'Berlin',
      shippingAddressLine1: 'Invalidenstrasse 117',
      shippingAddressLine2: 'Floor 2',
      postalCode: '10115',
    });

    expect(address).toEqual({
      shippingCountry: 'Germany',
      shippingRegion: 'Berlin',
      shippingCity: 'Berlin',
      shippingAddressLine1: 'Invalidenstrasse 117',
      shippingAddressLine2: 'Floor 2',
      postalCode: '10115',
      shippingAddress:
        'Invalidenstrasse 117\nFloor 2\nBerlin, Berlin, 10115\nGermany',
    });
    expect(formatShippingAddress(address)).toBe(address.shippingAddress);
  });

  it('keeps legacy address-only payloads compatible', () => {
    const address = normalizeShippingAddress({
      shippingAddress: '123 Legacy Street',
      postalCode: '10001',
    });

    expect(address.shippingAddress).toBe('123 Legacy Street');
    expect(address.shippingAddressLine1).toBe('123 Legacy Street');
    expect(
      validateShippingAddress({
        shippingAddress: '123 Legacy Street',
        postalCode: '10001',
      })
    ).toEqual(expect.objectContaining({ valid: true }));
  });

  it('requires country when line 1 is mirrored into the legacy address field', () => {
    expect(
      validateShippingAddress({
        shippingAddress: '1 Main Street',
        shippingAddressLine1: '1 Main Street',
      })
    ).toEqual(
      expect.objectContaining({
        valid: false,
        error: 'Please enter the shipping country.',
      })
    );
  });

  it('requires country when structured address fields are used', () => {
    expect(
      validateShippingAddress({
        shippingAddressLine1: '1 Main Street',
      })
    ).toEqual(
      expect.objectContaining({
        valid: false,
        error: 'Please enter the shipping country.',
      })
    );
  });
});
