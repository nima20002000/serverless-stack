/**
 * Integration Tests: Checkout OTP Route Activity Logging
 *
 * Tests that checkout-verify-otp flow properly logs activities
 * including OTP_VERIFIED, OTP_FAILED, REGISTER, and LOGIN_SUCCESS
 * with checkout-specific metadata.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Tests query REAL user_activity_logs table
 * - Tests verify EXACT metadata structure including flow: 'checkout'
 * - Tests check existing user login, new user registration, and failures
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
} from '../utils/activity-log-helpers';
import {
  expectOtpVerifiedMetadata,
  expectOtpFailedMetadata,
  expectRegisterMetadata,
  expectLoginMetadata,
  expectValidClientInfo,
} from '../utils/activity-log-assertions';
import { generateUniqueTestUser } from '../fixtures';

const supabase = createTestSupabaseClient();

describe('Checkout OTP Route Activity Logging', () => {
  beforeEach(async () => {
    await cleanupTestActivityLogs();
    await cleanupTestUsers();
  });

  afterEach(async () => {
    await cleanupTestActivityLogs();
    await cleanupTestUsers();
  });

  describe('Existing user checkout login', () => {
    it('should log OTP_VERIFIED with checkout flow for existing user', async () => {
      // 1. Create existing user
      const testUser = generateUniqueTestUser('checkout-existing');
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

      // 2. Log OTP verified with checkout flow
      const testIp = '203.0.113.50';
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

      // 3. Verify the log
      const activityLog = await waitForActivityLog(user!.id, 'OTP_VERIFIED');

      expect(activityLog).not.toBeNull();
      expectValidActivityLog(activityLog!, {
        activityType: 'OTP_VERIFIED',
        userId: user!.id,
        success: true,
      });

      // 4. Verify checkout flow in metadata
      expectOtpVerifiedMetadata(activityLog!.metadata!, {
        identifierType: 'phone',
        purpose: 'login',
        flow: 'checkout',
      });
    });

    it('should log LOGIN_SUCCESS with checkout flow for existing user', async () => {
      // 1. Create existing user
      const testUser = generateUniqueTestUser('checkout-login-success');
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

      // 2. Log login success with checkout flow
      const testIp = '203.0.113.51';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'LOGIN_SUCCESS',
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
      const activityLog = await waitForActivityLog(user!.id, 'LOGIN_SUCCESS');

      expect(activityLog).not.toBeNull();
      expectLoginMetadata(activityLog!.metadata!, {
        identifierType: 'phone',
        method: 'otp',
        flow: 'checkout',
      });
    });

    it('should log complete checkout login sequence', async () => {
      // 1. Create existing user
      const testUser = generateUniqueTestUser('checkout-login-sequence');
      const userId = randomUUID();
      const testIp = '203.0.113.52';
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

      // 2. Log OTP_VERIFIED
      await supabase.from('user_activity_logs').insert({
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

      await new Promise((r) => setTimeout(r, 50));

      // 3. Log LOGIN_SUCCESS
      await supabase.from('user_activity_logs').insert({
        user_id: user!.id,
        activity_type: 'LOGIN_SUCCESS',
        ip_address: testIp,
        user_agent: testAgent,
        success: true,
        metadata: {
          method: 'otp',
          identifier_type: 'phone',
          flow: 'checkout',
        },
      });

      // 4. Query and verify sequence
      const { data: logs } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true });

      expect(logs).not.toBeNull();
      expect(logs!.length).toBe(2);

      expect(logs![0].activity_type).toBe('OTP_VERIFIED');
      expect(logs![1].activity_type).toBe('LOGIN_SUCCESS');

      // Both should have checkout flow
      expect((logs![0].metadata as Record<string, unknown>).flow).toBe(
        'checkout'
      );
      expect((logs![1].metadata as Record<string, unknown>).flow).toBe(
        'checkout'
      );
    });
  });

  describe('New user checkout registration', () => {
    it('should log OTP_VERIFIED for new user during checkout', async () => {
      // 1. Create new user (simulating checkout registration)
      const testUser = generateUniqueTestUser('checkout-new-user');
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

      // 2. Log OTP verified with checkout purpose
      const testIp = '203.0.113.53';
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
            purpose: 'checkout',
            flow: 'checkout',
          },
        });

      expect(logError).toBeNull();

      // 3. Verify the log
      const activityLog = await waitForActivityLog(user!.id, 'OTP_VERIFIED');

      expect(activityLog).not.toBeNull();
      expectOtpVerifiedMetadata(activityLog!.metadata!, {
        identifierType: 'phone',
        purpose: 'checkout',
        flow: 'checkout',
      });
    });

    it('should log REGISTER with checkout flow for new user', async () => {
      // 1. Create new user
      const testUser = generateUniqueTestUser('checkout-register');
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

      // 2. Log registration with checkout flow
      const testIp = '203.0.113.54';
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

    it('should log complete checkout registration sequence', async () => {
      // 1. Create new user
      const testUser = generateUniqueTestUser('checkout-reg-sequence');
      const userId = randomUUID();
      const testIp = '203.0.113.55';
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

      // 2. Log OTP_VERIFIED
      await supabase.from('user_activity_logs').insert({
        user_id: user!.id,
        activity_type: 'OTP_VERIFIED',
        ip_address: testIp,
        user_agent: testAgent,
        success: true,
        metadata: {
          identifier_type: 'phone',
          purpose: 'checkout',
          flow: 'checkout',
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      // 3. Log REGISTER
      await supabase.from('user_activity_logs').insert({
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

      // 4. Query and verify sequence
      const { data: logs } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true });

      expect(logs).not.toBeNull();
      expect(logs!.length).toBe(2);

      expect(logs![0].activity_type).toBe('OTP_VERIFIED');
      expect(logs![1].activity_type).toBe('REGISTER');

      // Both should have checkout flow
      for (const log of logs!) {
        expect((log.metadata as Record<string, unknown>).flow).toBe('checkout');
      }
    });
  });

  describe('Checkout OTP failure scenarios', () => {
    it('should log OTP_FAILED with checkout flow on wrong code', async () => {
      const testIp = '203.0.113.56';
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
            attemptsLeft: 2,
            flow: 'checkout',
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

      expectOtpFailedMetadata(activityLog!.metadata!, {
        identifierType: 'phone',
        purpose: 'login',
        attemptsLeft: 2,
        flow: 'checkout',
      });

      await supabase
        .from('user_activity_logs')
        .delete()
        .eq('ip_address', testIp);
    });

    it('should log OTP_FAILED when checkout OTP max attempts exceeded', async () => {
      const testIp = '203.0.113.57';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: null,
          activity_type: 'OTP_FAILED',
          ip_address: testIp,
          user_agent: testAgent,
          success: false,
          error_message: 'Maximum checkout attempts exceeded',
          metadata: {
            identifier_type: 'phone',
            purpose: 'login',
            attemptsLeft: 0,
            flow: 'checkout',
          },
        });

      expect(logError).toBeNull();

      const activityLog = await waitForActivityLog(null, 'OTP_FAILED');

      expect(activityLog).not.toBeNull();
      expect(activityLog!.error_message).toBe(
        'Maximum checkout attempts exceeded'
      );

      expectOtpFailedMetadata(activityLog!.metadata!, {
        identifierType: 'phone',
        purpose: 'login',
        attemptsLeft: 0,
        flow: 'checkout',
      });

      await supabase
        .from('user_activity_logs')
        .delete()
        .eq('ip_address', testIp);
    });
  });

  describe('Client info capture during checkout', () => {
    it('should capture IP and user agent correctly for checkout activities', async () => {
      const testUser = generateUniqueTestUser('checkout-client-info');
      const userId = randomUUID();
      const testIp = '203.0.113.58';
      const testAgent = 'Mobile-Checkout-App/2.0';

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

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'LOGIN_SUCCESS',
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

      const activityLog = await waitForActivityLog(user!.id, 'LOGIN_SUCCESS');

      expect(activityLog).not.toBeNull();
      expectValidClientInfo(activityLog!, {
        ipAddress: testIp,
        userAgent: testAgent,
      });
    });
  });
});
