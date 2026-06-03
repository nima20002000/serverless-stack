/**
 * Helper functions for testing user activity logging
 *
 * Provides utilities for querying, validating, and cleaning up activity logs
 * during integration tests.
 */

import { createTestSupabaseClient } from './test-client';
import type { Database } from '../../src/types/supabase';

type ActivityLog = Database['public']['Tables']['user_activity_logs']['Row'];
type ActivityType = Database['public']['Enums']['activity_type'];

const supabase = createTestSupabaseClient();

/**
 * Query activity logs for a specific user and activity type
 */
export async function getActivityLogs(
  userId: string | null,
  activityType?: ActivityType,
  limit: number = 10
): Promise<ActivityLog[]> {
  let query = supabase
    .from('user_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId !== null) {
    query = query.eq('user_id', userId);
  } else {
    query = query.is('user_id', null);
  }

  if (activityType) {
    query = query.eq('activity_type', activityType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to query activity logs: ${error.message}`);
  }

  return data || [];
}

/**
 * Get the most recent activity log matching criteria
 */
export async function getMostRecentActivityLog(
  userId: string | null,
  activityType: ActivityType
): Promise<ActivityLog | null> {
  const logs = await getActivityLogs(userId, activityType, 1);
  return logs[0] || null;
}

/**
 * Get activity logs by IP address (useful for testing guest/anonymous logs)
 */
export async function getActivityLogsByIp(
  ipAddress: string,
  activityType?: ActivityType,
  limit: number = 10
): Promise<ActivityLog[]> {
  let query = supabase
    .from('user_activity_logs')
    .select('*')
    .eq('ip_address', ipAddress)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (activityType) {
    query = query.eq('activity_type', activityType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to query activity logs by IP: ${error.message}`);
  }

  return data || [];
}

/**
 * Cleanup activity logs for test users
 * Call in afterEach/beforeEach
 * Uses timeouts to prevent hanging on network issues
 */
export async function cleanupTestActivityLogs(): Promise<void> {
  const timeoutPromise = (promise: Promise<unknown>, ms: number) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Cleanup timeout')), ms)
      ),
    ]);

  try {
    // Delete logs with test IP addresses (most reliable cleanup method)
    await timeoutPromise(
      supabase
        .from('user_activity_logs')
        .delete()
        .like('ip_address', '203.0.113.%')
        .then(() => {}),
      5000
    );
  } catch {
    // Silently ignore cleanup failures
  }

  try {
    // Delete logs with test user agent
    await timeoutPromise(
      supabase
        .from('user_activity_logs')
        .delete()
        .like('user_agent', 'Test-Agent/%')
        .then(() => {}),
      5000
    );
  } catch {
    // Silently ignore cleanup failures
  }
}

/**
 * Delete a specific activity log by ID
 */
export async function deleteActivityLog(logId: string): Promise<void> {
  const { error } = await supabase
    .from('user_activity_logs')
    .delete()
    .eq('id', logId);

  if (error) {
    throw new Error(`Failed to delete activity log: ${error.message}`);
  }
}

/**
 * Delete all activity logs for a specific user
 */
export async function deleteUserActivityLogs(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_activity_logs')
    .delete()
    .eq('user_id', userId);

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to delete user activity logs: ${error.message}`);
  }
}

/**
 * Wait for activity log to appear (fire-and-forget may have delay)
 * Max wait: 2 seconds
 * @param createdAfter - Only find logs created after this timestamp (ISO string)
 */
export async function waitForActivityLog(
  userId: string | null,
  activityType: ActivityType,
  timeoutMs: number = 2000,
  createdAfter?: string
): Promise<ActivityLog | null> {
  const startTime = Date.now();
  const afterTimestamp =
    createdAfter || new Date(startTime - 5000).toISOString(); // Default to 5 seconds ago

  while (Date.now() - startTime < timeoutMs) {
    let query = supabase
      .from('user_activity_logs')
      .select('*')
      .eq('activity_type', activityType)
      .gte('created_at', afterTimestamp)
      .order('created_at', { ascending: false })
      .limit(1);

    if (userId !== null) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data } = await query;
    if (data && data.length > 0) {
      return data[0];
    }
    // Wait 100ms before trying again
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return null;
}

/**
 * Wait for activity log with specific criteria
 */
export async function waitForActivityLogWithCriteria(
  criteria: {
    userId?: string | null;
    activityType?: ActivityType;
    ipAddress?: string;
    success?: boolean;
  },
  timeoutMs: number = 2000
): Promise<ActivityLog | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    let query = supabase
      .from('user_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (criteria.userId !== undefined) {
      if (criteria.userId === null) {
        query = query.is('user_id', null);
      } else {
        query = query.eq('user_id', criteria.userId);
      }
    }

    if (criteria.activityType) {
      query = query.eq('activity_type', criteria.activityType);
    }

    if (criteria.ipAddress) {
      query = query.eq('ip_address', criteria.ipAddress);
    }

    if (criteria.success !== undefined) {
      query = query.eq('success', criteria.success);
    }

    const { data } = await query;
    if (data && data.length > 0) {
      return data[0];
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return null;
}

/**
 * Count activity logs matching criteria
 */
export async function countActivityLogs(
  userId: string | null,
  activityType?: ActivityType
): Promise<number> {
  let query = supabase
    .from('user_activity_logs')
    .select('*', { count: 'exact', head: true });

  if (userId !== null) {
    query = query.eq('user_id', userId);
  } else {
    query = query.is('user_id', null);
  }

  if (activityType) {
    query = query.eq('activity_type', activityType);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count activity logs: ${error.message}`);
  }

  return count || 0;
}

/**
 * Verify activity log has expected structure and values
 */
export function expectValidActivityLog(
  log: ActivityLog,
  expected: {
    activityType: ActivityType;
    userId?: string | null;
    success?: boolean;
    hasMetadata?: boolean;
    hasIpAddress?: boolean;
    hasUserAgent?: boolean;
  }
) {
  // Verify required fields
  if (!log) {
    throw new Error('Activity log is undefined or null');
  }
  if (!log.id) {
    throw new Error('Activity log missing id');
  }
  if (log.activity_type !== expected.activityType) {
    throw new Error(
      `Expected activity_type ${expected.activityType} but got ${log.activity_type}`
    );
  }
  if (!log.created_at) {
    throw new Error('Activity log missing created_at');
  }

  // Verify user_id
  if (expected.userId !== undefined) {
    if (log.user_id !== expected.userId) {
      throw new Error(
        `Expected user_id ${expected.userId} but got ${log.user_id}`
      );
    }
  }

  // Verify success flag
  if (expected.success !== undefined) {
    if (log.success !== expected.success) {
      throw new Error(
        `Expected success ${expected.success} but got ${log.success}`
      );
    }
  }

  // Verify metadata presence
  if (expected.hasMetadata !== false) {
    if (log.metadata === undefined || log.metadata === null) {
      throw new Error('Expected metadata but got undefined/null');
    }
    if (typeof log.metadata !== 'object') {
      throw new Error(
        `Expected metadata to be object but got ${typeof log.metadata}`
      );
    }
  }

  // Verify IP address
  if (expected.hasIpAddress !== false) {
    if (!log.ip_address) {
      throw new Error('Expected ip_address but got falsy value');
    }
    if (typeof log.ip_address !== 'string') {
      throw new Error(
        `Expected ip_address to be string but got ${typeof log.ip_address}`
      );
    }
  }

  // Verify user agent
  if (expected.hasUserAgent !== false) {
    if (!log.user_agent) {
      throw new Error('Expected user_agent but got falsy value');
    }
    if (typeof log.user_agent !== 'string') {
      throw new Error(
        `Expected user_agent to be string but got ${typeof log.user_agent}`
      );
    }
  }
}
