import 'server-only';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import {
  getPhoneLookupCandidates,
  normalizePhoneNumber,
} from '@/lib/utils/text';
import {
  detectIdentifierType,
  generateNextUID,
  linkOrphanedTransactions,
} from './user-service';

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: 'USER' | 'ADMIN';
}

/**
 * Authenticate user with identifier (email or phone) and password
 * @param identifier User email or phone number
 * @param password User password
 * @returns Authenticated user data
 * @throws Error if authentication fails
 */
export async function authenticateUser(
  identifier: string,
  password: string
): Promise<AuthUser> {
  if (!identifier || !password) {
    throw new Error('Email/phone number and password are required.');
  }

  try {
    const identifierType = detectIdentifierType(identifier);

    if (identifierType === 'invalid') {
      throw new Error('Enter a valid email address or phone number.');
    }

    const supabase = createClient();

    // Find user by email or phone
    const userQuery = supabase.from('users').select('*').limit(1);
    const { data: user, error } =
      identifierType === 'email'
        ? await userQuery.eq('email', identifier).maybeSingle()
        : await userQuery
            .in('phone', getPhoneLookupCandidates(identifier))
            .maybeSingle();

    if (error || !user) {
      log.warn('Login attempt with non-existent identifier', {
        identifier,
        identifierType,
      });
      throw new Error('No account was found for those credentials.');
    }

    // Check if user has a password (phone-only users might not have password)
    if (!user.password) {
      log.warn('Login attempt for user without password', {
        identifier,
        userId: user.id,
      });
      throw new Error(
        'This account does not have a password. Use one-time sign-in or set a password first.'
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      log.warn('Login attempt with invalid password', {
        identifier,
        userId: user.id,
      });
      throw new Error('Password is incorrect.');
    }

    log.info('User authenticated successfully', {
      identifier,
      userId: user.id,
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    log.error('Authentication error', { identifier, error });
    throw new Error('Unable to authenticate.');
  }
}

/**
 * Authenticate user by phone (OTP-verified, no password)
 * This is called after OTP verification
 * @param phone User phone number
 * @returns Authenticated user data
 * @throws Error if authentication fails
 */
export async function authenticateUserByPhone(
  phone: string
): Promise<AuthUser> {
  if (!phone) {
    throw new Error('Phone number is required.');
  }

  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    const phoneLookupCandidates = getPhoneLookupCandidates(phone);
    const supabase = createClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .in('phone', phoneLookupCandidates)
      .limit(1)
      .maybeSingle();

    if (error || !user) {
      log.warn('Login attempt with non-existent phone', {
        phone: normalizedPhone,
      });
      throw new Error('No account was found for that phone number.');
    }

    log.info('User authenticated successfully via phone', {
      phone: normalizedPhone,
      userId: user.id,
    });

    // Link any orphaned guest transactions with this phone
    try {
      const linkedCount = await linkOrphanedTransactions(user.id, phone);
      if (linkedCount > 0) {
        log.info('Linked orphaned transactions during phone login', {
          userId: user.id,
          phone: normalizedPhone,
          count: linkedCount,
        });
      }
    } catch (error) {
      log.error('Failed to link orphaned transactions during phone login', {
        userId: user.id,
        phone: normalizedPhone,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't fail authentication if linking fails
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    log.error('Phone authentication error', { phone, error });
    throw new Error('Unable to authenticate by phone.');
  }
}

/**
 * Authenticate user by email (OTP-verified, no password)
 * This is called after OTP verification for email-based OTP login
 * @param email User email address
 * @returns Authenticated user data
 * @throws Error if authentication fails
 */
export async function authenticateUserByEmail(
  email: string
): Promise<AuthUser> {
  if (!email) {
    throw new Error('Email is required.');
  }

  try {
    const supabase = createClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      log.warn('Login attempt with non-existent email', { email });
      throw new Error('No account was found for that email address.');
    }

    log.info('User authenticated successfully via email', {
      email,
      userId: user.id,
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    log.error('Email authentication error', { email, error });
    throw new Error('Unable to authenticate by email.');
  }
}

/**
 * Register a new user
 * @param name User name
 * @param email User email
 * @param password User password
 * @returns Created user data
 * @throws Error if registration fails
 */
export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<AuthUser> {
  if (!name || !email || !password) {
    throw new Error('Name, email, and password are required.');
  }

  try {
    const supabase = createClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new Error('An account with this email already exists.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with retry logic for UID conflicts (race condition handling)
    let user;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        // Generate next UID using centralized function
        const uid = await generateNextUID();

        // Attempt to create user
        const now = new Date().toISOString();
        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: randomUUID(),
            uid,
            name,
            email,
            password: hashedPassword,
            role: 'USER', // Default role
            updatedAt: now,
          })
          .select()
          .single();

        if (createError) {
          // Check if error is due to unique constraint violation on UID
          if (
            createError.code === '23505' &&
            createError.message?.includes('uid')
          ) {
            // UID conflict - retry with new UID
            retries++;
            log.warn('UID conflict detected during registration, retrying', {
              retries,
              email,
            });

            if (retries >= maxRetries) {
              log.error(
                'Max retries reached for UID generation during registration',
                { email }
              );
              throw new Error('Unable to create account ID.');
            }

            // Wait a bit before retrying to reduce collision probability
            await new Promise((resolve) => setTimeout(resolve, 100 * retries));
            continue;
          }

          // Other error - throw
          throw createError;
        }

        user = createdUser;
        // Success - break out of retry loop
        break;
      } catch (error) {
        // If it's not a UID conflict error and we haven't exceeded retries, rethrow
        if (
          retries >= maxRetries ||
          !(error instanceof Error && error.message?.includes('uid'))
        ) {
          throw error;
        }
      }
    }

    if (!user) {
      throw new Error('Unable to create account.');
    }

    log.info('User registered successfully', { email, userId: user.id });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    log.error('Registration error', { email, error });
    throw new Error('Unable to create account.');
  }
}
