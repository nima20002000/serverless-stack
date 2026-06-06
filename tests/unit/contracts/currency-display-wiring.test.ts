import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(__dirname, '../../..');
const hardcodedCurrencySymbolPattern = /(?:^|[^{])\$(?!\{)|[€£¥]/;
const hardcodedCurrencyCodePattern = /\b(?:USD|EUR|JPY|GBP)\b/;
const paymentResultMoneyFieldNames =
  '(?:amount|amountCents|amountTotal|amountSubtotal|amount_cents|amount_total|amount_subtotal|price|priceCents|price_cents|subtotal|subtotalAmount|subtotal_amount|total|totalAmount|total_amount|paymentAmount|paymentAmountMinor|paymentAmountCents|payment_amount|payment_amount_minor|payment_amount_cents|finalTotal|final_total|orderTotal|order_total|cartTotal|cart_total)';
const paymentResultDataObjectNames =
  '(?:data|response|transaction|payment|provider|params|query|searchParams|statusResponse|transactionStatus)';
const quotedPaymentMoneyField = String.raw`['"\`]${paymentResultMoneyFieldNames}['"\`]`;
const rawMoneyFieldPattern = new RegExp(
  String.raw`(?:\b(?:searchParams|params|query)\.get\(\s*${quotedPaymentMoneyField}\s*\)|\b${paymentResultDataObjectNames}\s*\.\s*${paymentResultMoneyFieldNames}\b|\b${paymentResultDataObjectNames}\s*\[\s*${quotedPaymentMoneyField}\s*\]|(?:const|let|var)\s*\{[^}]*\b${paymentResultMoneyFieldNames}\b[^}]*\}\s*=\s*${paymentResultDataObjectNames}\b)`
);
const formatUtilsImportPattern =
  /import\s*\{[^}]*\bformatPrice\b[^}]*\}\s*from ['"]@\/lib\/utils\/format['"]/;
const cartStoreImportPattern =
  /import\s*\{[^}]*\bformatPrice\b[^}]*\}\s*from ['"]@\/store\/cart-store['"]/;

type MoneyDisplaySource = {
  path: string;
  importPattern: RegExp;
  minFormatPriceCalls: number;
};

const moneyDisplaySources: MoneyDisplaySource[] = [
  {
    path: 'src/app/products/[id]/page.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 1,
  },
  {
    path: 'src/components/products/ProductCard.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 3,
  },
  {
    path: 'src/components/products/ProductDetail.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 3,
  },
  {
    path: 'src/components/products/VariantSelector.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 2,
  },
  {
    path: 'src/components/ui/SearchBar.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 1,
  },
  {
    path: 'src/components/wishlist/WishlistItemCard.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 4,
  },
  {
    path: 'src/components/cart/CartDrawer.tsx',
    importPattern: cartStoreImportPattern,
    minFormatPriceCalls: 1,
  },
  {
    path: 'src/components/cart/CartItem.tsx',
    importPattern: cartStoreImportPattern,
    minFormatPriceCalls: 2,
  },
  {
    path: 'src/components/cart/CartSummary.tsx',
    importPattern: cartStoreImportPattern,
    minFormatPriceCalls: 2,
  },
  {
    path: 'src/app/checkout/page.tsx',
    importPattern: cartStoreImportPattern,
    minFormatPriceCalls: 6,
  },
  {
    path: 'src/components/checkout/PromoCodeInput.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 2,
  },
  {
    path: 'src/app/admin/promo-codes/page.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 2,
  },
  {
    path: 'src/services/promo-service.ts',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 1,
  },
  {
    path: 'src/app/admin/products/page.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 3,
  },
  {
    path: 'src/app/admin/transactions/page.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 1,
  },
  {
    path: 'src/app/admin/users/[id]/page.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 1,
  },
  {
    path: 'src/app/admin/page.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 3,
  },
  {
    path: 'src/components/admin/TransactionDetailModal.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 4,
  },
  {
    path: 'src/components/admin/VariantManager.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 1,
  },
  {
    path: 'src/components/profile/TransactionHistory.tsx',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 2,
  },
  {
    path: 'src/lib/email/client.ts',
    importPattern: formatUtilsImportPattern,
    minFormatPriceCalls: 6,
  },
];

const currencyLabelOnlySources = [
  {
    path: 'src/components/admin/ProductFormFields.tsx',
    fieldName: 'price',
  },
  {
    path: 'src/components/admin/VariantManager.tsx',
    fieldName: 'priceAdjust',
  },
];

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

function extractDisplayTextCandidates(source: string): string {
  const sourceWithoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const stringLiteralText = [
    ...sourceWithoutComments.matchAll(
      /(["'`])((?:\\[\s\S]|(?!\1)[\s\S])*?)\1/g
    ),
  ].map((match) => match[2]);
  const jsxText = [...sourceWithoutComments.matchAll(/>([^<>{}]+)</g)].map(
    (match) => match[1]
  );

  return [...stringLiteralText, ...jsxText].join('\n');
}

function expectNoDirectCurrencyFormatting(source: string): void {
  const displayTextCandidates = extractDisplayTextCandidates(source);

  expect(source).not.toMatch(/\bIntl\.NumberFormat\b/);
  expect(source).not.toMatch(/\.toLocaleString\s*\(/);
  expect(displayTextCandidates).not.toMatch(hardcodedCurrencySymbolPattern);
  expect(displayTextCandidates).not.toMatch(hardcodedCurrencyCodePattern);
}

function expectInputLabelUsesSiteCurrency(
  source: string,
  fieldName: string
): void {
  const inputBlocks = source.match(/<Input\b[\s\S]*?\/>/g) ?? [];
  const inputBlock = inputBlocks.find((block) =>
    new RegExp(String.raw`\bname=["']${fieldName}["']`).test(block)
  );

  expect(inputBlock).toBeDefined();
  expect(inputBlock).toMatch(
    /\blabel=\{[\s\S]*\bsiteLocale\.currency\b[\s\S]*\}/
  );
}

describe('currency display wiring contract', () => {
  it.each(moneyDisplaySources)(
    '$path formats money through the shared currency formatter',
    ({ path, importPattern, minFormatPriceCalls }) => {
      const source = readSource(path);
      const formatPriceCallCount =
        source.match(/\bformatPrice\s*\(/g)?.length ?? 0;

      expect(source).toMatch(importPattern);
      expect(formatPriceCallCount).toBeGreaterThanOrEqual(minFormatPriceCalls);
      expectNoDirectCurrencyFormatting(source);
    }
  );

  it.each(currencyLabelOnlySources)(
    '$path keeps currency labels configuration-driven',
    ({ path, fieldName }) => {
      const source = readSource(path);

      expectInputLabelUsesSiteCurrency(source, fieldName);
      expectNoDirectCurrencyFormatting(source);
    }
  );

  it('keeps cart store formatPrice as a thin delegate to the shared formatter', () => {
    const source = readSource('src/store/cart-store.ts');

    expect(source).toMatch(
      /import \{ formatPrice as formatStorefrontPrice \} from ['"]@\/lib\/utils\/format['"]/
    );
    expect(source).toMatch(
      /export function formatPrice\(price: number\): string \{\s*return formatStorefrontPrice\(price\);\s*\}/
    );
  });

  it('documents that payment result pages do not render monetary amounts', () => {
    for (const path of [
      'src/app/payment/success/page.tsx',
      'src/app/payment/failure/page.tsx',
    ]) {
      const source = readSource(path);

      expect(source).not.toMatch(/\bformatPrice\s*\(/);
      expect(source).not.toMatch(rawMoneyFieldPattern);
      expectNoDirectCurrencyFormatting(source);
    }
  });
});
