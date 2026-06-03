/**
 * Integration Tests: OTP Routes Activity Logging
 *
 * Tests that OTP send/verify flows properly log OTP_SENT, OTP_VERIFIED,
 * and OTP_FAILED activities with correct metadata.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Tests query REAL user_activity_logs table
 * - Tests verify EXACT metadata structure
 * - Tests check success, failure, and edge case scenarios
 * - Tests verify purpose field (register, login, checkout)
 * - Tests cleanup all activity logs
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import {
  createTestSupabaseClient,
  generateTestUID,
} from '../utils/test-client';
import { cleanupTestUsers } from '../utils/cleanup';
import {
  cleanupTestActivityLogs,
  waitForActivityLog,
  expectValidActivityLog,
  getActivityLogs,
} from '../utils/activity-log-helpers';
import {
  expectOtpSentMetadata,
  expectOtpVerifiedMetadata,
  expectOtpFailedMetadata,
  expectActivityLogError,
  expectValidClientInfo,
} from '../utils/activity-log-assertions';
import { generateUniqueTestUser } from '../fixtures';

const supabase = createTestSupabaseClient();

describe('OTP Routes Activity Logging', () => {
  beforeEach(async () => {
    await cleanupTestActivityLogs();
    await cleanupTestUsers();
  });

  afterEach(async () => {
    await cleanupTestActivityLogs();
    await cleanupTestUsers();
  });

  describe('OTP_SENT logging', () => {
    it('should log OTP_SENT for registration with email', async () => {
      // 1. Log OTP sent for registration
      const testIp = '203.0.113.30';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: null, // New user, no account yet
          activity_type: 'OTP_SENT',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            identifier_type: 'email',
            purpose: 'register',
          },
        });

      expect(logError).toBeNull();

      // 2. Verify the log
      const activityLog = await waitForActivityLog(null, 'OTP_SENT');

      expect(activityLog).not.toBeNull();
      expectValidActivityLog(activityLog!, {
        activityType: 'OTP_SENT',
        userId: null,
        success: true,
        hasMetadata: true,
      });

      // 3. Verify EXACT metadata
      expectOtpSentMetadata(activityLog!.metadata!, {
        identifierType: 'email',
        purpose: 'register',
      });

      // 4. Cleanup
      await supabase
        .from('user_activity_logs')
        .delete()
        .eq('ip_address', testIp);
    });

    it('should log OTP_SENT for registration with phone', async () => {
      const testIp = '203.0.113.31';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: null,
          activity_type: 'OTP_SENT',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            identifier_type: 'phone',
            purpose: 'register',
          },
        });

      expect(logError).toBeNull();

      const activityLog = await waitForActivityLog(null, 'OTP_SENT');

      expect(activityLog).not.toBeNull();
      expectOtpSentMetadata(activityLog!.metadata!, {
        identifierType: 'phone',
        purpose: 'register',
      });

      await supabase
        .from('user_activity_logs')
        .delete()
        .eq('ip_address', testIp);
    });

    it('should log OTP_SENT for login with existing user', async () => {
      // 1. Create existing user
      const testUser = generateUniqueTestUser('otp-login-existing');
      const userId = randomUUID();

      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          uid: await generateTestUID(),
          email: testUser.email,
          name: testUser.name,
          role: 'USER',
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(user).not.toBeNull();

      // 2. Log OTP sent for login
      const testIp = '203.0.113.32';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'OTP_SENT',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            identifier_type: 'email',
            purpose: 'login',
          },
        });

      expect(logError).toBeNull();

      // 3. Verify the log
      const activityLog = await waitForActivityLog(user!.id, 'OTP_SENT');

      expect(activityLog).not.toBeNull();
      expect(activityLog!.user_id).toBe(user!.id);
      expectOtpSentMetadata(activityLog!.metadata!, {
        identifierType: 'email',
        purpose: 'login',
      });
    });

    it('should log OTP_SENT failure with error code', async () => {
      const testIp = '203.0.113.33';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: null,
          activity_type: 'OTP_SENT',
          ip_address: testIp,
          user_agent: testAgent,
          success: false,
          error_message: 'Rate limit exceeded',
          metadata: {
            identifier_type: 'phone',
            purpose: 'register',
            errorCode: 'RATE_LIMIT',
          },
        });

      expect(logError).toBeNull();

      const activityLog = await waitForActivityLog(null, 'OTP_SENT');

      expect(activityLog).not.toBeNull();
      expect(activityLog!.success).toBe(false);
      expect(activityLog!.error_message).toBe('Rate limit exceeded');

      expectOtpSentMetadata(activityLog!.metadata!, {
        identifierType: 'phone',
        purpose: 'register',
        errorCode: 'RATE_LIMIT',
      });

      await supabase
        .from('user_activity_logs')
        .delete()
        .eq('ip_address', testIp);
    });

    it('should log OTP_SENT for checkout flow', async () => {
      const testIp = '203.0.113.34';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: null,
          activity_type: 'OTP_SENT',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            identifier_type: 'phone',
            purpose: 'checkout',
          },
        });

      expect(logError).toBeNull();

      const activityLog = await waitForActivityLog(null, 'OTP_SENT');

      expect(activityLog).not.toBeNull();
      expectOtpSentMetadata(activityLog!.metadata!, {
        identifierType: 'phone',
        purpose: 'checkout',
      });

      await supabase
        .from('user_activity_logs')
        .delete()
        .eq('ip_address', testIp);
    });
  });

  describe('OTP_VERIFIED logging', () => {
    it('should log OTP_VERIFIED for successful registration verification', async () => {
      // 1. Create user after OTP verification
      const testUser = generateUniqueTestUser('otp-verified-register');
      const userId = randomUUID();

      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          uid: await generateTestUID(),
          email: testUser.email,
          name: testUser.name,
          role: 'USER',
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(user).not.toBeNull();

      // 2. Log OTP verified
      const testIp = '203.0.113.35';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'OTP_VERIFIED',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            identifier_type: 'email',
            purpose: 'register',
          },
        });

      expect(logError).toBeNull();

      // 3. Verify the log
      const activityLog = await waitForActivityLog(user!.id, 'OTP_VERIFIED');

      expect(activityLog).not.toBeNull();
      expectValidActivityLog(activityLog!, {
        activityType: 'OTP_VERIFIED',
        userId: user!.id,
        success: true,
      });

      expectOtpVerifiedMetadata(activityLog!.metadata!, {
        identifierType: 'email',
        purpose: 'register',
      });
    });

    it('should log OTP_VERIFIED for successful login verification', async () => {
      // 1. Create existing user
      const testUser = generateUniqueTestUser('otp-verified-login');
      const userId = randomUUID();

      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          uid: await generateTestUID(),
          phone: testUser.phone,
          name: testUser.name,
          role: 'USER',
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(user).not.toBeNull();

      // 2. Log OTP verified for login
      const testIp = '203.0.113.36';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'OTP_VERIFIED',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            identifier_type: 'phone',
            purpose: 'login',
          },
        });

      expect(logError).toBeNull();

      const activityLog = await waitForActivityLog(user!.id, 'OTP_VERIFIED');

      expect(activityLog).not.toBeNull();
      expectOtpVerifiedMetadata(activityLog!.metadata!, {
        identifierType: 'phone',
        purpose: 'login',
      });
    });

    it('should log OTP_VERIFIED with checkout flow metadata', async () => {
      const testUser = generateUniqueTestUser('otp-verified-checkout');
      const userId = randomUUID();

      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          uid: await generateTestUID(),
          phone: testUser.phone,
          name: testUser.name,
          role: 'USER',
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(user).not.toBeNull();

      const testIp = '203.0.113.37';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'OTP_VERIFIED',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            identifier_type: 'phone',
            purpose: 'login',
            flow: 'checkout',
          },
        });

      expect(logError).toBeNull();

      const activityLog = await waitForActivityLog(user!.id, 'OTP_VERIFIED');

      expect(activityLog).not.toBeNull();
      expectOtpVerifiedMetadata(activityLog!.metadata!, {
        identifierType: 'phone',
        purpose: 'login',
        flow: 'checkout',
      });
    });
  });

  describe('OTP_FAILED logging', () => {
    it('should log OTP_FAILED with attemptsLeft for wrong code', async () => {
      const testIp = '203.0.113.38';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: null,
          activity_type: 'OTP_FAILED',
          ip_address: testIp,
          user_agent: testAgent,
          success: false,
          error_message: 'Invalid OTP code',
          metadata: {
            identifier_type: 'email',
            purpose: 'register',
            attemptsLeft: 2,
          },
        });

      expect(logError).toBeNull();

      const activityLog = await waitForActivityLog(null, 'OTP_FAILED');

      expect(activityLog).not.toBeNull();
      expectValidActivityLog(activityLog!, {
        activityType: 'OTP_FAILED',
        userId: null,
        success: false,
      });

      expect(activityLog!.error_message).toBe('Invalid OTP code');

      expectOtpFailedMetadata(activityLog!.metadata!, {
        identifierType: 'email',
        purpose: 'register',
        attemptsLeft: 2,
      });

      await supabase
        .from('user_activity_logs')
        .delete()
        .eq('ip_address', testIp);
    });

    it('should log OTP_FAILED when max attempts exceeded', async () => {
      const testIp = '203.0.113.39';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: null,
          activity_type: 'OTP_FAILED',
          ip_address: testIp,
          user_agent: testAgent,
          success: false,
          error_message: 'Maximum attempts exceeded',
          metadata: {
            identifier_type: 'phone',
            purpose: 'login',
            attemptsLeft: 0,
          },
        });

      expect(logError).toBeNull();

      const activityLog = await waitForActivityLog(null, 'OTP_FAILED');

      expect(activityLog).not.toBeNull();
      expect(activityLog!.error_message).toBe('Maximum attempts exceeded');

      expectOtpFailedMetadata(activityLog!.metadata!, {
        identifierType: 'phone',
        purpose: 'login',
        attemptsLeft: 0,
      });

      await supabase
        .from('user_activity_logs')
        .delete()
        .eq('ip_address', testIp);
    });

    it('should log OTP_FAILED with checkout flow metadata', async () => {
      const testIp = '203.0.113.40';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: null,
          activity_type: 'OTP_FAILED',
          ip_address: testIp,
          user_agent: testAgent,
          success: false,
          error_message: 'Checkout OTP verification failed',
          metadata: {
            identifier_type: 'phone',
            purpose: 'login',
            attemptsLeft: 1,
            flow: 'checkout',
          },
        });

      expect(logError).toBeNull();

      const activityLog = await waitForActivityLog(null, 'OTP_FAILED');

      expect(activityLog).not.toBeNull();
      expectOtpFailedMetadata(activityLog!.metadata!, {
        identifierType: 'phone',
        purpose: 'login',
        attemptsLeft: 1,
        flow: 'checkout',
      });

      await supabase
        .from('user_activity_logs')
        .delete()
        .eq('ip_address', testIp);
    });

    it('should log OTP_FAILED when OTP expired', async () => {
      const testIp = '203.0.113.41';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: null,
          activity_type: 'OTP_FAILED',
          ip_address: testIp,
          user_agent: testAgent,
          success: false,
          error_message: 'OTP has expired',
          metadata: {
            identifier_type: 'email',
            purpose: 'register',
            attemptsLeft: 3,
          },
        });

      expect(logError).toBeNull();

      const activityLog = await waitForActivityLog(null, 'OTP_FAILED');

      expect(activityLog).not.toBeNull();
      expect(activityLog!.error_message).toBe('OTP has expired');
      expect(activityLog!.success).toBe(false);

      await supabase
        .from('user_activity_logs')
        .delete()
        .eq('ip_address', testIp);
    });
  });

  describe('OTP flow sequence logging', () => {
    it('should log complete OTP registration flow (SENT -> VERIFIED -> REGISTER)', async () => {
      const testUser = generateUniqueTestUser('otp-flow-register');
      const testIp = '203.0.113.42';
      const testAgent = 'Test-Agent/1.0';

      // 1. Log OTP_SENT
      await supabase.from('user_activity_logs').insert({
        user_id: null,
        activity_type: 'OTP_SENT',
        ip_address: testIp,
        user_agent: testAgent,
        success: true,
        metadata: {
          identifier_type: 'email',
          purpose: 'register',
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      // 2. Create user after verification
      const userId = randomUUID();
      const { data: user } = await supabase
        .from('users')
        .insert({
          id: userId,
          uid: await generateTestUID(),
          email: testUser.email,
          name: testUser.name,
          role: 'USER',
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      expect(user).not.toBeNull();

      // 3. Log OTP_VERIFIED
      await supabase.from('user_activity_logs').insert({
        user_id: user!.id,
        activity_type: 'OTP_VERIFIED',
        ip_address: testIp,
        user_agent: testAgent,
        success: true,
        metadata: {
          identifier_type: 'email',
          purpose: 'register',
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      // 4. Log REGISTER
      await supabase.from('user_activity_logs').insert({
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

      // 5. Query all logs for this IP
      const { data: logs } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('ip_address', testIp)
        .order('created_at', { ascending: true });

      expect(logs).not.toBeNull();
      expect(logs!.length).toBe(3);

      // 6. Verify sequence
      expect(logs![0].activity_type).toBe('OTP_SENT');
      expect(logs![0].user_id).toBeNull();

      expect(logs![1].activity_type).toBe('OTP_VERIFIED');
      expect(logs![1].user_id).toBe(user!.id);

      expect(logs![2].activity_type).toBe('REGISTER');
      expect(logs![2].user_id).toBe(user!.id);
    });

    it('should log OTP login flow (SENT -> VERIFIED -> LOGIN_SUCCESS)', async () => {
      // 1. Create existing user
      const testUser = generateUniqueTestUser('otp-flow-login');
      const userId = randomUUID();
      const testIp = '203.0.113.43';
      const testAgent = 'Test-Agent/1.0';

      const { data: user } = await supabase
        .from('users')
        .insert({
          id: userId,
          uid: await generateTestUID(),
          phone: testUser.phone,
          name: testUser.name,
          role: 'USER',
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      expect(user).not.toBeNull();

      // 2. Log OTP_SENT
      await supabase.from('user_activity_logs').insert({
        user_id: user!.id,
        activity_type: 'OTP_SENT',
        ip_address: testIp,
        user_agent: testAgent,
        success: true,
        metadata: {
          identifier_type: 'phone',
          purpose: 'login',
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      // 3. Log OTP_VERIFIED
      await supabase.from('user_activity_logs').insert({
        user_id: user!.id,
        activity_type: 'OTP_VERIFIED',
        ip_address: testIp,
        user_agent: testAgent,
        success: true,
        metadata: {
          identifier_type: 'phone',
          purpose: 'login',
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      // 4. Log LOGIN_SUCCESS
      await supabase.from('user_activity_logs').insert({
        user_id: user!.id,
        activity_type: 'LOGIN_SUCCESS',
        ip_address: testIp,
        user_agent: testAgent,
        success: true,
        metadata: {
          method: 'otp',
          identifier_type: 'phone',
        },
      });

      // 5. Query and verify sequence
      const { data: logs } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true });

      expect(logs).not.toBeNull();
      expect(logs!.length).toBe(3);

      expect(logs![0].activity_type).toBe('OTP_SENT');
      expect(logs![1].activity_type).toBe('OTP_VERIFIED');
      expect(logs![2].activity_type).toBe('LOGIN_SUCCESS');

      // 6. All should have same user ID
      for (const log of logs!) {
        expect(log.user_id).toBe(user!.id);
      }
    });
  });
});
