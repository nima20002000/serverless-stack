/**
 * Transaction Test Fixtures
 */

export const testShippingInfo = {
  standard: {
    fullName: 'Alex Morgan',
    phone: '+12025551001',
    address: '123 Demo Street',
    postalCode: '1234567890',
    city: 'Testville',
    province: 'CA',
  },
  detailed: {
    fullName: 'Jordan Lee',
    phone: '+12025551002',
    address: '45 Fixture Avenue, Suite 15',
    postalCode: '9876543210',
    city: 'Sample City',
    province: 'NY',
    notes: 'Please deliver between 10:00 and 12:00.',
  },
} as const;

export function generateTestTransactionItem(
  productId: string,
  variantId?: string
) {
  return {
    productId,
    variantId: variantId || null,
    quantity: Math.floor(Math.random() * 3) + 1, // 1-3 items
    unitPrice: Math.floor(Math.random() * 500) + 50,
  };
}

export function generateTestTransactionData(userId?: string) {
  const items = [
    {
      productId: 'temp-product-id-1', // Will be replaced with real ID in tests
      variantId: null,
      quantity: 2,
      unitPrice: 150,
    },
    {
      productId: 'temp-product-id-2',
      variantId: null,
      quantity: 1,
      unitPrice: 300,
    },
  ];

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return {
    userId: userId || null,
    items,
    shippingInfo: testShippingInfo.standard,
    totalAmount,
    discountAmount: 0,
    finalAmount: totalAmount,
  };
}

export function generateUniqueTransactionCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `TEST-${timestamp}-${random}`;
}
