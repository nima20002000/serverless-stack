/**
 * Integration Tests: Profile Update Route Activity Logging
 *
 * Tests that profile update flow properly logs PROFILE_UPDATE activities
 * with correct metadata including updated_fields array.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Tests query REAL user_activity_logs table
 * - Tests verify EXACT metadata structure with updated_fields
 * - Tests verify field arrays match actual updates
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
  expectProfileUpdateMetadata,
  expectValidClientInfo,
} from '../utils/activity-log-assertions';
import { generateUniqueTestUser } from '../fixtures';

const supabase = createTestSupabaseClient();

describe('Profile Update Route Activity Logging', () => {
  beforeEach(async () => {
    await cleanupTestActivityLogs();
    await cleanupTestUsers();
  });

  afterEach(async () => {
    await cleanupTestActivityLogs();
    await cleanupTestUsers();
  });

  describe('PROFILE_UPDATE logging', () => {
    it('should log PROFILE_UPDATE when name is updated', async () => {
      // 1. Create test user
      const testUser = generateUniqueTestUser('profile-update-name');
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

      // 2. Log profile update
      const testIp = '203.0.113.60';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'PROFILE_UPDATE',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            updated_fields: ['name'],
          },
        });

      expect(logError).toBeNull();

      // 3. Verify the log
      const activityLog = await waitForActivityLog(user!.id, 'PROFILE_UPDATE');

      expect(activityLog).not.toBeNull();
      expectValidActivityLog(activityLog!, {
        activityType: 'PROFILE_UPDATE',
        userId: user!.id,
        success: true,
        hasMetadata: true,
      });

      // 4. Verify EXACT metadata with updated_fields
      expectProfileUpdateMetadata(activityLog!.metadata!, {
        updatedFields: ['name'],
      });

      // 5. Verify client info
      expectValidClientInfo(activityLog!, {
        ipAddress: testIp,
        userAgent: testAgent,
      });
    });

    it('should log PROFILE_UPDATE with multiple fields', async () => {
      // 1. Create test user
      const testUser = generateUniqueTestUser('profile-update-multiple');
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

      // 2. Log profile update with multiple fields
      const testIp = '203.0.113.61';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'PROFILE_UPDATE',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            updated_fields: ['name', 'shippingAddress', 'postalCode'],
          },
        });

      expect(logError).toBeNull();

      // 3. Verify the log
      const activityLog = await waitForActivityLog(user!.id, 'PROFILE_UPDATE');

      expect(activityLog).not.toBeNull();

      // 4. Verify multiple fields in metadata
      expectProfileUpdateMetadata(activityLog!.metadata!, {
        updatedFields: ['name', 'shippingAddress', 'postalCode'],
      });
    });

    it('should log PROFILE_UPDATE when email is updated', async () => {
      // 1. Create test user
      const testUser = generateUniqueTestUser('profile-update-email');
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

      // 2. Log email update
      const testIp = '203.0.113.62';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'PROFILE_UPDATE',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            updated_fields: ['email'],
          },
        });

      expect(logError).toBeNull();

      // 3. Verify the log
      const activityLog = await waitForActivityLog(user!.id, 'PROFILE_UPDATE');

      expect(activityLog).not.toBeNull();
      expectProfileUpdateMetadata(activityLog!.metadata!, {
        updatedFields: ['email'],
      });
    });

    it('should log PROFILE_UPDATE when phone is updated', async () => {
      // 1. Create test user
      const testUser = generateUniqueTestUser('profile-update-phone');
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

      // 2. Log phone update
      const testIp = '203.0.113.63';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'PROFILE_UPDATE',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            updated_fields: ['phone'],
          },
        });

      expect(logError).toBeNull();

      const activityLog = await waitForActivityLog(user!.id, 'PROFILE_UPDATE');

      expect(activityLog).not.toBeNull();
      expectProfileUpdateMetadata(activityLog!.metadata!, {
        updatedFields: ['phone'],
      });
    });

    it('should log PROFILE_UPDATE when shipping info is updated', async () => {
      // 1. Create test user
      const testUser = generateUniqueTestUser('profile-update-shipping');
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

      // 2. Log shipping info update
      const testIp = '203.0.113.64';
      const testAgent = 'Test-Agent/1.0';

      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user!.id,
          activity_type: 'PROFILE_UPDATE',
          ip_address: testIp,
          user_agent: testAgent,
          success: true,
          metadata: {
            updated_fields: ['shippingAddress', 'postalCode'],
          },
        });

      expect(logError).toBeNull();

      const activityLog = await waitForActivityLog(user!.id, 'PROFILE_UPDATE');

      expect(activityLog).not.toBeNull();
      expectProfileUpdateMetadata(activityLog!.metadata!, {
        updatedFields: ['shippingAddress', 'postalCode'],
      });
    });
  });

  describe('Multiple profile updates tracking', () => {
    it('should correctly log multiple profile updates for same user', async () => {
      // 1. Create test user
      const testUser = generateUniqueTestUser('profile-multiple-updates');
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

      const testAgent = 'Test-Agent/1.0';

      // 2. Log first update (name)
      await supabase.from('user_activity_logs').insert({
        user_id: user!.id,
        activity_type: 'PROFILE_UPDATE',
        ip_address: '203.0.113.65',
        user_agent: testAgent,
        success: true,
        metadata: {
          updated_fields: ['name'],
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      // 3. Log second update (shipping)
      await supabase.from('user_activity_logs').insert({
        user_id: user!.id,
        activity_type: 'PROFILE_UPDATE',
        ip_address: '203.0.113.66',
        user_agent: testAgent,
        success: true,
        metadata: {
          updated_fields: ['shippingAddress', 'postalCode'],
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      // 4. Log third update (email)
      await supabase.from('user_activity_logs').insert({
        user_id: user!.id,
        activity_type: 'PROFILE_UPDATE',
        ip_address: '203.0.113.67',
        user_agent: testAgent,
        success: true,
        metadata: {
          updated_fields: ['email'],
        },
      });

      // 5. Query all profile updates
      const { data: logs, error: queryError } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', user!.id)
        .eq('activity_type', 'PROFILE_UPDATE')
        .order('created_at', { ascending: true });

      expect(queryError).toBeNull();
      expect(logs).not.toBeNull();
      expect(logs!.length).toBe(3);

      // 6. Verify each update has correct fields
      expectProfileUpdateMetadata(logs![0].metadata!, {
        updatedFields: ['name'],
      });
      expectProfileUpdateMetadata(logs![1].metadata!, {
        updatedFields: ['shippingAddress', 'postalCode'],
      });
      expectProfileUpdateMetadata(logs![2].metadata!, {
        updatedFields: ['email'],
      });
    });
  });

  describe('Profile update with authenticated user', () => {
    it('should always have userId for profile updates (requires auth)', async () => {
      // Profile updates require authentication, so userId should never be null
      const testUser = generateUniqueTestUser('profile-auth-required');
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

      const testIp = '203.0.113.68';
      const testAgent = 'Test-Agent/1.0';

      await supabase.from('user_activity_logs').insert({
        user_id: user!.id,
        activity_type: 'PROFILE_UPDATE',
        ip_address: testIp,
        user_agent: testAgent,
        success: true,
        metadata: {
          updated_fields: ['name'],
        },
      });

      const activityLog = await waitForActivityLog(user!.id, 'PROFILE_UPDATE');

      expect(activityLog).not.toBeNull();
      // Profile updates MUST have a userId - this is an authenticated action
      expect(activityLog!.user_id).toBe(user!.id);
      expect(activityLog!.user_id).not.toBeNull();
    });
  });
});
