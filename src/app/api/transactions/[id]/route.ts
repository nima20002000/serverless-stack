import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getTransactionById } from '@/services/transaction-service';

export const dynamic = 'force-dynamic';

// GET /api/transactions/[id] - Get transaction details
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'برای دسترسی به این صفحه باید وارد شوید' },
        { status: 401 }
      );
    }

    const transaction = await getTransactionById(params.id);

    // Verify user owns this transaction or is admin
    if (
      transaction.userId !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { error: 'شما دسترسی به این تراکنش ندارید' },
        { status: 403 }
      );
    }

    // Serialize Decimal fields
    const serializedTransaction = {
      ...transaction,
      amount: Number(transaction.amount),
      items: transaction.items.map((item) => ({
        ...item,
        price: Number(item.price),
        product: {
          ...item.product,
          price: Number(item.product.price),
        },
      })),
    };

    return NextResponse.json({ transaction: serializedTransaction });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در دریافت تراکنش' },
      { status: 404 }
    );
  }
}
