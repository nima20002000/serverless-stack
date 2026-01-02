/**
 * Integration Tests: Activity Log Service
 *
 * Validates logUserActivity writes real records with required metadata
 * and that logs are queryable by user, action, and client info.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Tests query REAL user_activity_logs table
 * - Tests verify metadata contents and client info
 * - Tests assert logs are persisted (would fail if logging is skipped)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import {
  logUserActivity,
  getUserActivityHistory,
} from '@/services/activity-log-service';
import {
  cleanupTestActivityLogs,
  waitForActivityLog,
  expectValidActivityLog,
  getActivityLogsByIp,
} from '../utils/activity-log-helpers';
import { cleanupTestUsers } from '../utils/cleanup';
import {
  expectLoginMetadata,
  expectPasswordChangeMetadata,
  expectValidClientInfo,
  expectActivityLogError,
} from '../utils/activity-log-assertions';
import {
  createTestSupabaseClient,
  generateTestUID,
} from '../utils/test-client';
import { generateUniqueTestUser } from '../fixtures';

const supabase = createTestSupabaseClient();

async function createTestUser() {
  const testUser = generateUniqueTestUser('activity-log-service');
  const userId = randomUUID();

  const { data: user, error } = await supabase
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

  if (error || !user) {
    throw new Error(
      `Failed to create test user: ${error?.message || 'unknown'}`
    );
  }

  return user;
}

describe('Activity Log Service Integration', () => {
  beforeEach(async () => {
    await cleanupTestActivityLogs();
    await cleanupTestUsers();
  });

  afterEach(async () => {
    await cleanupTestActivityLogs();
    await cleanupTestUsers();
  });

  it('should log PASSWORD_CHANGE with metadata and allow querying by user and ip', async () => {
    const user = await createTestUser();
    const testIp = '203.0.113.50';
    const testAgent = 'Test-Agent/2.0';
    const createdAfter = new Date().toISOString();

    const logged = await logUserActivity({
      userId: user.id,
      activityType: 'PASSWORD_CHANGE',
      ipAddress: testIp,
      userAgent: testAgent,
      success: true,
      metadata: {
        action: 'change',
      },
    });

    expect(logged).toBe(true);

    const activityLog = await waitForActivityLog(
      user.id,
      'PASSWORD_CHANGE',
      2000,
      createdAfter
    );

    expect(activityLog).not.toBeNull();
    expectValidActivityLog(activityLog!, {
      activityType: 'PASSWORD_CHANGE',
      userId: user.id,
      success: true,
      hasMetadata: true,
      hasIpAddress: true,
      hasUserAgent: true,
    });

    expectPasswordChangeMetadata(activityLog!.metadata!, { action: 'change' });
    expectValidClientInfo(activityLog!, {
      ipAddress: testIp,
      userAgent: testAgent,
    });

    const history = await getUserActivityHistory(user.id, 5);
    expect(history.some((log) => log.id === activityLog!.id)).toBe(true);

    const logsByIp = await getActivityLogsByIp(testIp, 'PASSWORD_CHANGE', 5);
    expect(logsByIp.some((log) => log.id === activityLog!.id)).toBe(true);
  });

  it('should log LOGIN_FAILED with success false and error metadata', async () => {
    const user = await createTestUser();
    const testIp = '203.0.113.51';
    const testAgent = 'Test-Agent/2.0';
    const createdAfter = new Date().toISOString();

    const logged = await logUserActivity({
      userId: user.id,
      activityType: 'LOGIN_FAILED',
      ipAddress: testIp,
      userAgent: testAgent,
      success: false,
      errorMessage: 'Invalid password',
      metadata: {
        identifier_type: 'email',
      },
    });

    expect(logged).toBe(true);

    const activityLog = await waitForActivityLog(
      user.id,
      'LOGIN_FAILED',
      2000,
      createdAfter
    );

    expect(activityLog).not.toBeNull();
    expectValidActivityLog(activityLog!, {
      activityType: 'LOGIN_FAILED',
      userId: user.id,
      success: false,
      hasMetadata: true,
      hasIpAddress: true,
      hasUserAgent: true,
    });

    expectLoginMetadata(activityLog!.metadata!, { identifierType: 'email' });
    expectValidClientInfo(activityLog!, {
      ipAddress: testIp,
      userAgent: testAgent,
    });
    expectActivityLogError(activityLog!, {
      success: false,
      errorMessage: 'Invalid password',
    });
  });
});
