/**
 * Transaction Test Fixtures
 */

export const testShippingInfo = {
  standard: {
    fullName: 'علی محمدی',
    phone: '09120000001',
    address: 'تهران، خیابان آزادی، پلاک ۱۲۳',
    postalCode: '1234567890',
    city: 'تهران',
    province: 'تهران',
  },
  detailed: {
    fullName: 'فاطمه احمدی',
    phone: '09120000002',
    address: 'مشهد، خیابان امام رضا، کوچه ۱۵، پلاک ۴۵',
    postalCode: '9876543210',
    city: 'مشهد',
    province: 'خراسان رضوی',
    notes: 'لطفا بین ساعت ۱۰ تا ۱۲ تحویل دهید',
  },
} as const;

export function generateTestTransactionItem(productId: string, variantId?: string) {
  return {
    productId,
    variantId: variantId || null,
    quantity: Math.floor(Math.random() * 3) + 1, // 1-3 items
    unitPrice: Math.floor(Math.random() * 500000) + 50000,
  };
}

export function generateTestTransactionData(userId?: string) {
  const items = [
    {
      productId: 'temp-product-id-1', // Will be replaced with real ID in tests
      variantId: null,
      quantity: 2,
      unitPrice: 150000,
    },
    {
      productId: 'temp-product-id-2',
      variantId: null,
      quantity: 1,
      unitPrice: 300000,
    },
  ];

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

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
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TEST-${timestamp}-${random}`;
}
