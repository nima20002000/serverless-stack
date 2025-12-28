import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { Database, Json } from '@/types/supabase';

// Activity type from database enum
type ActivityType = Database['public']['Enums']['activity_type'];

export interface ActivityLogData {
  userId?: string | null;
  activityType: ActivityType;
  ipAddress?: string | null;
  userAgent?: string | null;
  success?: boolean;
  errorMessage?: string | null;
  metadata?: Json;
}

/**
 * Log user activity to database
 * This function is fail-safe - if it throws an error, it won't crash the app
 *
 * @param data Activity log data
 * @returns true if logged successfully, false otherwise
 */
export async function logUserActivity(data: ActivityLogData): Promise<boolean> {
  try {
    const supabase = createClient();

    const { error } = await supabase.from('user_activity_logs').insert({
      user_id: data.userId || null,
      activity_type: data.activityType,
      ip_address: data.ipAddress || null,
      user_agent: data.userAgent || null,
      success: data.success ?? true,
      error_message: data.errorMessage || null,
      metadata: data.metadata || {},
    });

    if (error) {
      log.error('Failed to log user activity', {
        activityType: data.activityType,
        error: error.message,
      });
      return false;
    }

    log.debug('User activity logged', {
      activityType: data.activityType,
      userId: data.userId || 'guest',
      success: data.success ?? true,
    });

    return true;
  } catch (error) {
    // Fail silently - don't crash the app if logging fails
    log.error('Exception while logging user activity', {
      activityType: data.activityType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Get recent activity for a user
 * Useful for "Login History" or "Recent Activity" features
 *
 * @param userId User ID
 * @param limit Number of records to return (default: 20)
 * @returns Array of activity logs
 */
export async function getUserActivityHistory(
  userId: string,
  limit: number = 20
): Promise<Array<Database['public']['Tables']['user_activity_logs']['Row']>> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('user_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      log.error('Failed to fetch user activity history', {
        userId,
        error: error.message,
      });
      return [];
    }

    return data || [];
  } catch (error) {
    log.error('Exception while fetching user activity history', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Get failed login attempts count for monitoring
 * Can be used to detect brute force attacks
 *
 * @param sinceMinutes Check failed attempts in last N minutes (default: 30)
 * @returns Count of failed attempts
 */
export async function getFailedLoginAttempts(
  sinceMinutes: number = 30
): Promise<number> {
  try {
    const supabase = createClient();
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('user_activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('activity_type', 'LOGIN_FAILED')
      .gte('created_at', since);

    if (error) {
      log.error('Failed to fetch failed login attempts', {
        error: error.message,
      });
      return 0;
    }

    return count || 0;
  } catch (error) {
    log.error('Exception while fetching failed login attempts', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

/**
 * Clean up old activity logs
 * Should be run periodically (e.g., via cron job)
 *
 * @param retentionDays Number of days to keep logs (default: 90)
 * @returns Number of deleted records
 */
export async function cleanupOldActivityLogs(
  retentionDays: number = 90
): Promise<number> {
  try {
    const supabase = createClient();
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from('user_activity_logs')
      .delete()
      .lt('created_at', cutoffDate)
      .select('id');

    if (error) {
      log.error('Failed to cleanup old activity logs', {
        retentionDays,
        error: error.message,
      });
      return 0;
    }

    const deletedCount = data?.length || 0;
    log.info('Cleaned up old activity logs', {
      retentionDays,
      deletedCount,
    });

    return deletedCount;
  } catch (error) {
    log.error('Exception while cleaning up activity logs', {
      retentionDays,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}
