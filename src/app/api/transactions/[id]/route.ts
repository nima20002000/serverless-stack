import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getTransactionById } from '@/services/transaction-service';

export const dynamic = 'force-dynamic';
const MAX_ID_LENGTH = 64;

// GET /api/transactions/[id] - Get transaction details
export async function GET(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const params = await paramsPromise;
    if (!params.id || params.id.length > MAX_ID_LENGTH) {
      return NextResponse.json(
        { error: 'Invalid transaction id.' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Sign in to view this transaction.' },
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
        { error: 'You do not have access to this transaction.' },
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
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch transaction.',
      },
      { status: 404 }
    );
  }
}
