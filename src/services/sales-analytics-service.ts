import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

export type SalesAnalyticsGroupBy = 'day' | 'week' | 'month';
export type SalesAnalyticsStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export type SalesAnalyticsFilters = {
  startDate: string;
  endDate: string;
  groupBy: SalesAnalyticsGroupBy;
};

export type SalesAnalyticsTransaction = {
  id: string;
  transactionCode: string;
  amount: number | string;
  status: SalesAnalyticsStatus | string;
  paymentMethod: string | null;
  userId: string | null;
  isGuest: boolean | null;
  discountAmount: number | string | null;
  subtotal: number | string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    price: number | string;
    product: { id: string; name: string } | null;
    variant: {
      id: string;
      name: string;
      size: string | null;
      color: string | null;
      material: string | null;
    } | null;
  }>;
};

export type SalesAnalyticsSummary = {
  completedRevenue: number;
  totalSalesRevenue: number;
  completedOrders: number;
  averageOrderValue: number;
  totalAttempts: number;
  pendingAttempts: number;
  failedAttempts: number;
  paymentSuccessRate: number;
  discountTotal: number;
};

export type SalesAnalyticsResult = {
  filters: SalesAnalyticsFilters & {
    timezone: 'UTC';
  };
  summary: SalesAnalyticsSummary;
  timeline: Array<{
    key: string;
    label: string;
    completedRevenue: number;
    completedOrders: number;
    attempts: number;
  }>;
  breakdowns: {
    status: Array<{
      key: string;
      label: string;
      count: number;
      amount: number;
    }>;
    paymentProvider: Array<{
      key: string;
      label: string;
      count: number;
      completedRevenue: number;
    }>;
    customerType: Array<{
      key: 'registered' | 'guest';
      label: string;
      count: number;
      completedRevenue: number;
    }>;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    completedRevenue: number;
  }>;
  topVariants: Array<{
    variantId: string;
    productId: string;
    name: string;
    productName: string;
    quantity: number;
    completedRevenue: number;
  }>;
  attentionList: Array<{
    id: string;
    transactionCode: string;
    amount: number;
    status: string;
    paymentProvider: string;
    customerName: string;
    createdAt: string;
    reason: 'pending' | 'failed' | 'high_value';
  }>;
};

const GROUP_BY_VALUES = new Set<SalesAnalyticsGroupBy>([
  'day',
  'week',
  'month',
]);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;
const PAGE_SIZE = 1000;

function parseDateOnly(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${field} must be a valid date`);
  }

  return date;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseSalesAnalyticsFilters(
  searchParams: URLSearchParams,
  now = new Date()
): SalesAnalyticsFilters {
  const groupByParam = searchParams.get('groupBy') || 'day';
  if (!GROUP_BY_VALUES.has(groupByParam as SalesAnalyticsGroupBy)) {
    throw new Error('groupBy must be day, week, or month');
  }

  const defaultEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const defaultStart = new Date(
    defaultEnd.getTime() - DEFAULT_RANGE_DAYS * MS_PER_DAY
  );

  const startDate =
    searchParams.get('startDate') || toDateInputValue(defaultStart);
  const endDate = searchParams.get('endDate') || toDateInputValue(defaultEnd);

  const start = parseDateOnly(startDate, 'startDate');
  const end = parseDateOnly(endDate, 'endDate');

  if (start.getTime() > end.getTime()) {
    throw new Error('startDate must be on or before endDate');
  }

  const rangeDays =
    Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  if (rangeDays > 366) {
    throw new Error('Date range cannot exceed 366 days');
  }

  return {
    startDate,
    endDate,
    groupBy: groupByParam as SalesAnalyticsGroupBy,
  };
}

function dateRangeToQueryBounds(filters: SalesAnalyticsFilters) {
  const start = parseDateOnly(filters.startDate, 'startDate');
  const end = parseDateOnly(filters.endDate, 'endDate');
  const endExclusive = new Date(end.getTime() + MS_PER_DAY);

  return {
    startIso: start.toISOString(),
    endExclusiveIso: endExclusive.toISOString(),
  };
}

function toNumber(value: number | string | null | undefined): number {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function parseTransactionTimestamp(value: string): Date {
  const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid transaction timestamp: ${value}`);
  }

  return date;
}

function providerLabel(paymentMethod: string | null): string {
  if (!paymentMethod || paymentMethod === 'UNKNOWN') return 'Unknown provider';
  if (paymentMethod === 'STRIPE') return 'Stripe';
  if (paymentMethod === 'PAYPAL') return 'PayPal';
  return paymentMethod
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function getGroupKey(date: Date, groupBy: SalesAnalyticsGroupBy): string {
  if (groupBy === 'month') {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  if (groupBy === 'week') {
    const day = date.getUTCDay() || 7;
    const monday = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
    monday.setUTCDate(monday.getUTCDate() - day + 1);
    return toDateInputValue(monday);
  }

  return toDateInputValue(date);
}

function groupLabel(key: string, groupBy: SalesAnalyticsGroupBy): string {
  if (groupBy === 'month') return key;
  if (groupBy === 'week') return `Week of ${key}`;
  return key;
}

function addToMap<
  T extends { count?: number; completedRevenue?: number; amount?: number },
>(map: Map<string, T>, key: string, initial: T, updater: (item: T) => void) {
  const item = map.get(key) || initial;
  updater(item);
  map.set(key, item);
}

export function buildSalesAnalytics(
  transactions: SalesAnalyticsTransaction[],
  filters: SalesAnalyticsFilters
): SalesAnalyticsResult {
  const summary: SalesAnalyticsSummary = {
    completedRevenue: 0,
    totalSalesRevenue: 0,
    completedOrders: 0,
    averageOrderValue: 0,
    totalAttempts: transactions.length,
    pendingAttempts: 0,
    failedAttempts: 0,
    paymentSuccessRate: 0,
    discountTotal: 0,
  };
  const timeline = new Map<
    string,
    {
      key: string;
      label: string;
      completedRevenue: number;
      completedOrders: number;
      attempts: number;
    }
  >();
  const statusBreakdown = new Map<
    string,
    { key: string; label: string; count: number; amount: number }
  >();
  const providerBreakdown = new Map<
    string,
    { key: string; label: string; count: number; completedRevenue: number }
  >();
  const customerBreakdown = new Map<
    'registered' | 'guest',
    {
      key: 'registered' | 'guest';
      label: string;
      count: number;
      completedRevenue: number;
    }
  >();
  const productMap = new Map<
    string,
    {
      productId: string;
      name: string;
      quantity: number;
      completedRevenue: number;
    }
  >();
  const variantMap = new Map<
    string,
    {
      variantId: string;
      productId: string;
      name: string;
      productName: string;
      quantity: number;
      completedRevenue: number;
    }
  >();
  const amounts = transactions.map((tx) => toNumber(tx.amount));
  const highValueThreshold = amounts.length
    ? [...amounts].sort((a, b) => b - a)[Math.min(4, amounts.length - 1)]
    : 0;

  const attentionList: SalesAnalyticsResult['attentionList'] = [];

  for (const transaction of transactions) {
    const amount = toNumber(transaction.amount);
    const discountAmount = toNumber(transaction.discountAmount);
    const subtotal = toNumber(transaction.subtotal) || amount + discountAmount;
    const status = transaction.status || 'UNKNOWN';
    const isCompleted = status === 'COMPLETED';
    const createdAt = parseTransactionTimestamp(transaction.createdAt);
    const groupKey = getGroupKey(createdAt, filters.groupBy);
    const providerKey = transaction.paymentMethod || 'UNKNOWN';
    const customerKey =
      transaction.userId && !transaction.isGuest ? 'registered' : 'guest';
    const grossLineTotal = (transaction.items || []).reduce(
      (total, item) =>
        total + toNumber(item.price) * Number(item.quantity || 0),
      0
    );
    const revenueAllocationBase = subtotal > 0 ? subtotal : grossLineTotal;

    if (status === 'PENDING') summary.pendingAttempts += 1;
    if (status === 'FAILED') summary.failedAttempts += 1;
    if (isCompleted) {
      summary.completedOrders += 1;
      summary.completedRevenue += amount;
      summary.totalSalesRevenue += subtotal;
      summary.discountTotal += discountAmount;
    }

    addToMap(
      timeline,
      groupKey,
      {
        key: groupKey,
        label: groupLabel(groupKey, filters.groupBy),
        completedRevenue: 0,
        completedOrders: 0,
        attempts: 0,
      },
      (item) => {
        item.attempts += 1;
        if (isCompleted) {
          item.completedOrders += 1;
          item.completedRevenue += amount;
        }
      }
    );

    addToMap(
      statusBreakdown,
      status,
      { key: status, label: statusLabel(status), count: 0, amount: 0 },
      (item) => {
        item.count += 1;
        item.amount += amount;
      }
    );

    addToMap(
      providerBreakdown,
      providerKey,
      {
        key: providerKey,
        label: providerLabel(providerKey),
        count: 0,
        completedRevenue: 0,
      },
      (item) => {
        item.count += 1;
        if (isCompleted) item.completedRevenue += amount;
      }
    );

    addToMap(
      customerBreakdown,
      customerKey,
      {
        key: customerKey,
        label:
          customerKey === 'registered'
            ? 'Registered customers'
            : 'Guest customers',
        count: 0,
        completedRevenue: 0,
      },
      (item) => {
        item.count += 1;
        if (isCompleted) item.completedRevenue += amount;
      }
    );

    if (isCompleted) {
      for (const item of transaction.items || []) {
        const quantity = Number(item.quantity || 0);
        const itemGrossRevenue = toNumber(item.price) * quantity;
        const itemRevenue =
          revenueAllocationBase > 0
            ? amount * (itemGrossRevenue / revenueAllocationBase)
            : 0;
        const productName = item.product?.name || 'Unknown product';
        const product = productMap.get(item.productId) || {
          productId: item.productId,
          name: productName,
          quantity: 0,
          completedRevenue: 0,
        };
        product.quantity += quantity;
        product.completedRevenue += itemRevenue;
        productMap.set(item.productId, product);

        if (item.variantId) {
          const variantName = item.variant?.name || 'Unknown variant';
          const variant = variantMap.get(item.variantId) || {
            variantId: item.variantId,
            productId: item.productId,
            name: variantName,
            productName,
            quantity: 0,
            completedRevenue: 0,
          };
          variant.quantity += quantity;
          variant.completedRevenue += itemRevenue;
          variantMap.set(item.variantId, variant);
        }
      }
    }

    const reason =
      status === 'PENDING'
        ? 'pending'
        : status === 'FAILED'
          ? 'failed'
          : isCompleted && amount >= highValueThreshold && amount > 0
            ? 'high_value'
            : null;

    if (reason) {
      attentionList.push({
        id: transaction.id,
        transactionCode: transaction.transactionCode,
        amount,
        status,
        paymentProvider: providerLabel(providerKey),
        customerName:
          transaction.fullName ||
          transaction.email ||
          transaction.phone ||
          'Guest',
        createdAt: transaction.createdAt,
        reason,
      });
    }
  }

  summary.averageOrderValue =
    summary.completedOrders > 0
      ? summary.completedRevenue / summary.completedOrders
      : 0;
  summary.paymentSuccessRate =
    summary.totalAttempts > 0
      ? (summary.completedOrders / summary.totalAttempts) * 100
      : 0;

  return {
    filters: {
      ...filters,
      timezone: 'UTC',
    },
    summary,
    timeline: [...timeline.values()].sort((a, b) => a.key.localeCompare(b.key)),
    breakdowns: {
      status: [...statusBreakdown.values()].sort((a, b) => b.count - a.count),
      paymentProvider: [...providerBreakdown.values()].sort(
        (a, b) => b.count - a.count
      ),
      customerType: [...customerBreakdown.values()].sort((a, b) =>
        a.key.localeCompare(b.key)
      ),
    },
    topProducts: [...productMap.values()]
      .sort((a, b) => b.completedRevenue - a.completedRevenue)
      .slice(0, 5),
    topVariants: [...variantMap.values()]
      .sort((a, b) => b.completedRevenue - a.completedRevenue)
      .slice(0, 5),
    attentionList: attentionList
      .sort((a, b) => {
        const reasonRank = { failed: 0, pending: 1, high_value: 2 };
        return (
          reasonRank[a.reason] - reasonRank[b.reason] ||
          b.amount - a.amount ||
          parseTransactionTimestamp(b.createdAt).getTime() -
            parseTransactionTimestamp(a.createdAt).getTime()
        );
      })
      .slice(0, 10),
  };
}

export async function getSalesAnalytics(
  filters: SalesAnalyticsFilters
): Promise<SalesAnalyticsResult> {
  const supabase = await createClient();
  const { startIso, endExclusiveIso } = dateRangeToQueryBounds(filters);
  const transactions: SalesAnalyticsTransaction[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('transactions')
      .select(
        `
      id,
      transactionCode,
      amount,
      status,
      paymentMethod,
      userId,
      isGuest,
      discountAmount,
      subtotal,
      fullName,
      email,
      phone,
      createdAt,
      items:transaction_items(
        id,
        productId,
        variantId,
        quantity,
        price,
        product:products(id, name),
        variant:product_variants(id, name, size, color, material)
      )
    `
      )
      .gte('createdAt', startIso)
      .lt('createdAt', endExclusiveIso)
      .order('createdAt', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      log.error('Error fetching sales analytics transactions', {
        error,
        filters,
        range: { from, to: from + PAGE_SIZE - 1 },
      });
      throw new Error('Unable to load sales analytics');
    }

    transactions.push(
      ...((data || []) as unknown as SalesAnalyticsTransaction[])
    );

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return buildSalesAnalytics(transactions, filters);
}
