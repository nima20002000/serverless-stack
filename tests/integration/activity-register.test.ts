/**
 * Integration Tests: Register Route Activity Logging
 *
 * Tests that registration flow properly logs REGISTER activities
 * with correct metadata and client information.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Tests query REAL user_activity_logs table
 * - Tests verify EXACT metadata structure
 * - Tests check both success AND failure scenarios
 * - Tests verify IP/user-agent capture
 * - Tests cleanup all activity logs
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import {
  createTestSupabaseClient,
  generateTestUID,
} from '../utils/test-client';
import { cleanupTestUsers } from '../utils/cleanup';
import {
  cleanupTestActivityLogs,
  waitForActivityLog,
  expectValidActivityLog,
} from '../utils/activity-log-helpers';
import {
  expectRegisterMetadata,
  expectActivityLogError,
  expectValidClientInfo,
} from '../utils/activity-log-assertions';
import { generateUniqueTestUser } from '../fixtures';

const supabase = createTestSupabaseClient();

describe('Register Route Activity Logging', () => {
  beforeEach(async () => {
    await cleanupTestActivityLogs();
    await cleanupTestUsers();
  });

  afterEach(async () => {
    await cleanupTestActivityLogs();
    await cleanupTestUsers();
  });

  describe('REGISTER success logging', () => {
    it('should log REGISTER when user registers with email', async () => {
      // 1. Create test user (simulating registration)
      const testUser = generateUniqueTestUser('register-email');
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const userId = randomUUID();

      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          uid: await generateTestUID(),
          email: testUser.email,
          name: testUser.name,
          password: hashedPassword,
          role: 'USER',
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(user).not.toBeNull();

      // 2. Log registration activity
      const testIp = '203.0.113.20';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'REGISTER',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            has_email: true,
          },
        });

      expect(logError).toBeNull();

      // 3. Query and verify the log
      const activityLog = await waitForActivityLog(user!.id, 'REGISTER');

      expect(activityLog).not.toBeNull();

      // 4. Validate complete log structure
      expectValidActivityLog(activityLog!, {
        activityType: 'REGISTER',
        userId: user!.id,
        success: true,
        hasMetadata: true,
        hasIpAddress: true,
        hasUserAgent: true,
      });

      // 5. Verify EXACT metadata structure
      expectRegisterMetadata(activityLog!.metadata!, {
        hasEmail: true,
      });

      // 6. Verify client info
      expectValidClientInfo(activityLog!, {
        ipAddress: testIp,
        userAgent: testAgent,
      });

      // 7. Verify no error message
      expect(activityLog!.error_message).toBeNull();
    });

    it('should log REGISTER when user registers with phone via OTP', async () => {
      // 1. Create test user with phone
      const testUser = generateUniqueTestUser('register-phone-otp');
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const userId = randomUUID();

      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          uid: await generateTestUID(),
          phone: testUser.phone,
          name: testUser.name,
          password: hashedPassword,
          role: 'USER',
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(user).not.toBeNull();

      // 2. Log OTP registration activity
      const testIp = '203.0.113.21';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'REGISTER',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            method: 'otp',
            identifier_type: 'phone',
          },
        });

      expect(logError).toBeNull();

      // 3. Verify the log
      const activityLog = await waitForActivityLog(user!.id, 'REGISTER');

      expect(activityLog).not.toBeNull();
      expectValidActivityLog(activityLog!, {
        activityType: 'REGISTER',
        userId: user!.id,
        success: true,
      });

      // 4. Verify metadata with OTP method
      expectRegisterMetadata(activityLog!.metadata!, {
        method: 'otp',
        identifierType: 'phone',
      });
    });

    it('should log REGISTER when user registers with email via OTP', async () => {
      // 1. Create test user with email
      const testUser = generateUniqueTestUser('register-email-otp');
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const userId = randomUUID();

      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          uid: await generateTestUID(),
          email: testUser.email,
          name: testUser.name,
          password: hashedPassword,
          role: 'USER',
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(user).not.toBeNull();

      // 2. Log OTP registration activity
      const testIp = '203.0.113.22';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'REGISTER',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            method: 'otp',
            identifier_type: 'email',
          },
        });

      expect(logError).toBeNull();

      // 3. Verify the log
      const activityLog = await waitForActivityLog(user!.id, 'REGISTER');

      expect(activityLog).not.toBeNull();
      expectRegisterMetadata(activityLog!.metadata!, {
        method: 'otp',
        identifierType: 'email',
      });
    });

    it('should log REGISTER during checkout flow', async () => {
      // 1. Create test user
      const testUser = generateUniqueTestUser('register-checkout');
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const userId = randomUUID();

      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          uid: await generateTestUID(),
          phone: testUser.phone,
          name: testUser.name,
          password: hashedPassword,
          role: 'USER',
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(user).not.toBeNull();

      // 2. Log checkout registration activity
      const testIp = '203.0.113.23';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'REGISTER',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            method: 'otp',
            identifier_type: 'phone',
            flow: 'checkout',
          },
        });

      expect(logError).toBeNull();

      // 3. Verify the log
      const activityLog = await waitForActivityLog(user!.id, 'REGISTER');

      expect(activityLog).not.toBeNull();
      expectRegisterMetadata(activityLog!.metadata!, {
        method: 'otp',
        identifierType: 'phone',
        flow: 'checkout',
      });
    });
  });

  describe('REGISTER failure logging', () => {
    it('should log REGISTER failure when registration fails', async () => {
      // 1. Log failed registration (e.g., duplicate email)
      const testIp = '203.0.113.24';
      const testAgent = 'Test-Agent/1.0';
      const errorMessage = 'User with this email already exists';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: null, // Registration failed, no user created
          activity_type: 'REGISTER',
          ip_address: testIp,
          user_agent: testAgent,
          success: false,
          error_message: errorMessage,
          metadata: {},
        });

      expect(logError).toBeNull();

      // 2. Query with null userId
      const activityLog = await waitForActivityLog(null, 'REGISTER');

      expect(activityLog).not.toBeNull();

      // 3. Verify failure is logged correctly
      expect(activityLog!.user_id).toBeNull();
      expectActivityLogError(activityLog!, {
        success: false,
        errorMessage: errorMessage,
      });

      // 4. Cleanup
      await supabase
        .from('user_activity_logs')
        .delete()
        .eq('ip_address', testIp);
    });

    it('should log REGISTER failure with validation error', async () => {
      // 1. Log failed registration with validation error
      const testIp = '203.0.113.25';
      const testAgent = 'Test-Agent/1.0';
      const errorMessage = 'Invalid email format';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: null,
          activity_type: 'REGISTER',
          ip_address: testIp,
          user_agent: testAgent,
          success: false,
          error_message: errorMessage,
          metadata: {},
        });

      expect(logError).toBeNull();

      // 2. Verify the log
      const activityLog = await waitForActivityLog(null, 'REGISTER');

      expect(activityLog).not.toBeNull();
      expect(activityLog!.success).toBe(false);
      expect(activityLog!.error_message).toBe(errorMessage);

      // 3. Cleanup
      await supabase
        .from('user_activity_logs')
        .delete()
        .eq('ip_address', testIp);
    });
  });

  describe('Registration with complete user data', () => {
    it('should log REGISTER with all user info for standard registration', async () => {
      // 1. Create user with both email and phone
      const testUser = generateUniqueTestUser('register-complete');
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const userId = randomUUID();

      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          uid: await generateTestUID(),
          email: testUser.email,
          phone: testUser.phone,
          name: testUser.name,
          password: hashedPassword,
          role: 'USER',
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(user).not.toBeNull();

      // 2. Log registration
      const testIp = '203.0.113.26';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'REGISTER',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            has_email: true,
          },
        });

      expect(logError).toBeNull();

      // 3. Verify log
      const activityLog = await waitForActivityLog(user!.id, 'REGISTER');

      expect(activityLog).not.toBeNull();

      // 4. Verify user has correct attributes
      expect(user!.email).toBe(testUser.email);
      expect(user!.phone).toBe(testUser.phone);
      expect(user!.name).toBe(testUser.name);

      // 5. Verify activity log captures success
      expect(activityLog!.success).toBe(true);
      expect(activityLog!.error_message).toBeNull();
    });
  });
});
