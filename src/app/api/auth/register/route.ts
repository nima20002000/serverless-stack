import { NextRequest, NextResponse } from 'next/server';
import { createUser, detectIdentifierType } from '@/services/user-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';
import { withLogging } from '@/lib/api/with-logging';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function postHandler(req: NextRequest) {
  // Extract client info for activity logging
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const body = await req.json();
    const { identifier, email, phone, password, name } = body;
    const providedIdentifier = identifier || email || phone;

    // Validate required fields (name is optional)
    if (!providedIdentifier || !password) {
      return NextResponse.json(
        { error: 'Email or phone number and password are required.' },
        { status: 400 }
      );
    }

    const normalizedIdentifier = String(providedIdentifier).trim();
    const identifierType = detectIdentifierType(normalizedIdentifier);

    if (identifierType === 'invalid') {
      return NextResponse.json(
        { error: 'Enter a valid email address or phone number.' },
        { status: 400 }
      );
    }

    // Create user (validation happens in service)
    // If name is not provided, use empty string as default
    const user = await createUser({
      email: identifierType === 'email' ? normalizedIdentifier : undefined,
      phone: identifierType === 'phone' ? normalizedIdentifier : undefined,
      password,
      name: name || '',
    });

    // Log successful registration (fire-and-forget)
    logUserActivity({
      userId: user.id,
      activityType: 'REGISTER',
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        identifier_type: identifierType,
      },
    }).catch((err) => {
      log.warn('Failed to log registration', {
        userId: user.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    // Log failed registration (fire-and-forget)
    logUserActivity({
      activityType: 'REGISTER',
      ipAddress,
      userAgent,
      success: false,
      errorMessage:
        error instanceof Error ? error.message : 'Registration failed',
    }).catch((err) => {
      log.warn('Failed to log registration failure', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

    // Return user-friendly error message
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to create account.',
      },
      { status: 400 }
    );
  }
}

// Rate limiting is handled by middleware (strictLimiter, 5 req/2min)
export const POST = withLogging(postHandler, 'POST /api/auth/register');
