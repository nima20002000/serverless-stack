import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    log.info('Testing Supabase connection...');

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    log.info('Environment check', {
      url: supabaseUrl,
      secretKeyPrefix: secretKey?.substring(0, 20),
      secretKeySuffix: secretKey?.substring(secretKey.length - 10),
      secretKeyLength: secretKey?.length,
      publishableKeyPrefix: publishableKey?.substring(0, 20),
      publishableKeyLength: publishableKey?.length,
    });

    if (!supabaseUrl || !secretKey) {
      log.error('Missing Supabase environment variables', {
        hasUrl: !!supabaseUrl,
        hasSecretKey: !!secretKey,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Supabase environment variables',
          details: {
            hasUrl: !!supabaseUrl,
            hasSecretKey: !!secretKey,
          }
        },
        { status: 500 }
      );
    }

    const supabase = createClient();

    log.info('Supabase client created, attempting query...');

    // Test connection by counting users
    const { count, error, status, statusText } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    log.info('Supabase query response', {
      count,
      hasError: !!error,
      errorKeys: error ? Object.keys(error) : [],
      errorMessage: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint,
      status,
      statusText
    });

    if (error) {
      log.error('Supabase query error', {
        error,
        errorString: JSON.stringify(error),
        errorType: typeof error,
        errorConstructor: error?.constructor?.name
      });
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Unknown error',
          details: {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            fullError: JSON.stringify(error)
          }
        },
        { status: 500 }
      );
    }

    log.info('Supabase connection successful', { userCount: count });
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      userCount: count,
    });
  } catch (error) {
    log.error('Unexpected error in test-supabase', { error });
    return NextResponse.json(
      { success: false, error: String(error), stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}
