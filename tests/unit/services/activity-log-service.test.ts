import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as activityLogService from '@/services/activity-log-service';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseMock, createQueryMock } from '../helpers/supabase-mock';

// Mock logger
vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Import logger for verification
import { log } from '@/lib/logger';

describe('activity-log-service', () => {
  const createClientMock = vi.mocked(createClient);
  const logMock = vi.mocked(log);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('logUserActivity', () => {
    // Happy Path Tests
    it('successfully logs activity with all fields and returns true', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        userId: 'user-123',
        activityType: 'LOGIN_SUCCESS',
        ipAddress: '203.0.113.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        success: true,
        errorMessage: null,
        metadata: { source: 'web', browser: 'Chrome' },
      });

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('user_activity_logs');
      expect(insertQuery.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        activity_type: 'LOGIN_SUCCESS',
        ip_address: '203.0.113.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        success: true,
        error_message: null,
        metadata: { source: 'web', browser: 'Chrome' },
      });
      expect(logMock.debug).toHaveBeenCalledWith(
        'User activity logged',
        expect.objectContaining({
          activityType: 'LOGIN_SUCCESS',
          userId: 'user-123',
          success: true,
        })
      );
    });

    it('successfully logs activity with minimal required fields only', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'LOGOUT',
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith({
        user_id: null,
        activity_type: 'LOGOUT',
        ip_address: null,
        user_agent: null,
        success: true, // defaults to true
        error_message: null,
        metadata: {}, // defaults to empty object
      });
    });

    // Test all activity types
    it('logs LOGIN_SUCCESS activity type correctly', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'LOGIN_SUCCESS',
        userId: 'user-1',
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ activity_type: 'LOGIN_SUCCESS' })
      );
    });

    it('logs LOGIN_FAILED activity type correctly', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'LOGIN_FAILED',
        success: false,
        errorMessage: 'Invalid credentials',
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_type: 'LOGIN_FAILED',
          success: false,
          error_message: 'Invalid credentials',
        })
      );
    });

    it('logs REGISTER activity type correctly', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'REGISTER',
        userId: 'new-user-123',
        metadata: { registrationMethod: 'email' },
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_type: 'REGISTER',
          user_id: 'new-user-123',
        })
      );
    });

    it('logs LOGOUT activity type correctly', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'LOGOUT',
        userId: 'user-123',
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ activity_type: 'LOGOUT' })
      );
    });

    it('logs PASSWORD_CHANGE activity type correctly', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'PASSWORD_CHANGE',
        userId: 'user-123',
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ activity_type: 'PASSWORD_CHANGE' })
      );
    });

    it('logs PROFILE_UPDATE activity type correctly', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'PROFILE_UPDATE',
        userId: 'user-123',
        metadata: { fieldsUpdated: ['name', 'email'] },
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ activity_type: 'PROFILE_UPDATE' })
      );
    });

    it('logs OTP_SENT activity type correctly', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'OTP_SENT',
        metadata: { phone: '09123456789' },
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ activity_type: 'OTP_SENT' })
      );
    });

    it('logs OTP_VERIFIED activity type correctly', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'OTP_VERIFIED',
        userId: 'user-123',
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ activity_type: 'OTP_VERIFIED' })
      );
    });

    it('logs OTP_FAILED activity type correctly', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'OTP_FAILED',
        success: false,
        errorMessage: 'Invalid OTP code',
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_type: 'OTP_FAILED',
          success: false,
          error_message: 'Invalid OTP code',
        })
      );
    });

    // Null/Undefined Handling Tests
    it('stores userId as null when passed as null (guest user)', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        userId: null,
        activityType: 'LOGIN_SUCCESS',
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: null })
      );
      expect(logMock.debug).toHaveBeenCalledWith(
        'User activity logged',
        expect.objectContaining({ userId: 'guest' })
      );
    });

    it('converts userId undefined to null', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        userId: undefined,
        activityType: 'LOGOUT',
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: null })
      );
    });

    it('stores ipAddress as null when not provided', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'LOGIN_SUCCESS',
        ipAddress: null,
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ ip_address: null })
      );
    });

    it('stores userAgent correctly when empty string', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'LOGIN_SUCCESS',
        userAgent: '',
      });

      expect(result).toBe(true);
      // Empty string should be converted to null due to || null
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ user_agent: null })
      );
    });

    // Error Handling Tests
    it('returns false when database insert fails and logs error', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({
        data: null,
        error: { message: 'Database connection failed' },
      });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'LOGIN_SUCCESS',
        userId: 'user-123',
      });

      expect(result).toBe(false);
      expect(logMock.error).toHaveBeenCalledWith(
        'Failed to log user activity',
        expect.objectContaining({
          activityType: 'LOGIN_SUCCESS',
          error: 'Database connection failed',
        })
      );
    });

    it('returns false and does not throw when createClient throws exception', async () => {
      createClientMock.mockImplementation(() => {
        throw new Error('Supabase initialization failed');
      });

      const result = await activityLogService.logUserActivity({
        activityType: 'LOGIN_SUCCESS',
      });

      expect(result).toBe(false);
      expect(logMock.error).toHaveBeenCalledWith(
        'Exception while logging user activity',
        expect.objectContaining({
          activityType: 'LOGIN_SUCCESS',
          error: 'Supabase initialization failed',
        })
      );
    });

    it('returns false and logs error when an unknown error occurs', async () => {
      createClientMock.mockImplementation(() => {
        throw 'Non-Error object thrown';
      });

      const result = await activityLogService.logUserActivity({
        activityType: 'LOGOUT',
      });

      expect(result).toBe(false);
      expect(logMock.error).toHaveBeenCalledWith(
        'Exception while logging user activity',
        expect.objectContaining({
          error: 'Unknown error',
        })
      );
    });

    // Edge Cases
    it('stores very long error message (1000+ characters) correctly', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const longErrorMessage = 'A'.repeat(1500);

      const result = await activityLogService.logUserActivity({
        activityType: 'LOGIN_FAILED',
        success: false,
        errorMessage: longErrorMessage,
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_message: longErrorMessage,
        })
      );
    });

    it('stores large metadata object (50+ keys) correctly', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const largeMetadata: Record<string, string> = {};
      for (let i = 0; i < 60; i++) {
        largeMetadata[`key_${i}`] = `value_${i}`;
      }

      const result = await activityLogService.logUserActivity({
        activityType: 'PROFILE_UPDATE',
        userId: 'user-123',
        metadata: largeMetadata,
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: largeMetadata,
        })
      );
      expect(Object.keys(largeMetadata)).toHaveLength(60);
    });

    it('handles special characters including unicode and Persian text', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'LOGIN_SUCCESS',
        userId: 'user-123',
        userAgent:
          'Mozilla/5.0 with emoji \u{1F600} and Persian \u0633\u0644\u0627\u0645',
        errorMessage:
          'Error: \u062E\u0637\u0627\u06CC \u0646\u0627\u0634\u0646\u0627\u062E\u062A\u0647',
        metadata: {
          name: '\u0639\u0644\u06CC \u0645\u062D\u0645\u062F\u06CC',
          emoji: '\u{1F4BB}\u{1F310}',
          sqlInjection: "'; DROP TABLE users; --",
        },
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_agent:
            'Mozilla/5.0 with emoji \u{1F600} and Persian \u0633\u0644\u0627\u0645',
          metadata: expect.objectContaining({
            name: '\u0639\u0644\u06CC \u0645\u062D\u0645\u062F\u06CC',
          }),
        })
      );
    });

    it('stores success as false when explicitly set', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.logUserActivity({
        activityType: 'LOGIN_FAILED',
        success: false,
      });

      expect(result).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('handles concurrent logging calls without race conditions', async () => {
      const supabase = createSupabaseMock();
      const insertQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(insertQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const promises = Array(10)
        .fill(null)
        .map((_, i) =>
          activityLogService.logUserActivity({
            activityType: 'LOGIN_SUCCESS',
            userId: `user-${i}`,
            metadata: { index: i },
          })
        );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every((r) => r === true)).toBe(true);
      expect(insertQuery.insert).toHaveBeenCalledTimes(10);
    });
  });

  describe('getUserActivityHistory', () => {
    it('returns activity logs for a user with default limit of 20', async () => {
      const supabase = createSupabaseMock();
      const mockLogs = [
        {
          id: 'log-1',
          activity_type: 'LOGIN_SUCCESS',
          created_at: '2025-01-01',
        },
        { id: 'log-2', activity_type: 'LOGOUT', created_at: '2025-01-02' },
      ];
      const selectQuery = createQueryMock({ data: mockLogs, error: null });
      supabase.from.mockReturnValue(selectQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result =
        await activityLogService.getUserActivityHistory('user-123');

      expect(result).toEqual(mockLogs);
      expect(supabase.from).toHaveBeenCalledWith('user_activity_logs');
      expect(selectQuery.select).toHaveBeenCalledWith('*');
      expect(selectQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(selectQuery.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(selectQuery.limit).toHaveBeenCalledWith(20);
    });

    it('respects custom limit parameter', async () => {
      const supabase = createSupabaseMock();
      const mockLogs = [{ id: 'log-1', activity_type: 'LOGIN_SUCCESS' }];
      const selectQuery = createQueryMock({ data: mockLogs, error: null });
      supabase.from.mockReturnValue(selectQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.getUserActivityHistory(
        'user-123',
        50
      );

      expect(result).toEqual(mockLogs);
      expect(selectQuery.limit).toHaveBeenCalledWith(50);
    });

    it('returns empty array when database error occurs', async () => {
      const supabase = createSupabaseMock();
      const selectQuery = createQueryMock({
        data: null,
        error: { message: 'Query failed' },
      });
      supabase.from.mockReturnValue(selectQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result =
        await activityLogService.getUserActivityHistory('user-123');

      expect(result).toEqual([]);
      expect(logMock.error).toHaveBeenCalledWith(
        'Failed to fetch user activity history',
        expect.objectContaining({
          userId: 'user-123',
          error: 'Query failed',
        })
      );
    });

    it('returns empty array when data is null', async () => {
      const supabase = createSupabaseMock();
      const selectQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(selectQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result =
        await activityLogService.getUserActivityHistory('user-123');

      expect(result).toEqual([]);
    });

    it('returns empty array and logs error when exception is thrown', async () => {
      createClientMock.mockImplementation(() => {
        throw new Error('Connection timeout');
      });

      const result =
        await activityLogService.getUserActivityHistory('user-123');

      expect(result).toEqual([]);
      expect(logMock.error).toHaveBeenCalledWith(
        'Exception while fetching user activity history',
        expect.objectContaining({
          userId: 'user-123',
          error: 'Connection timeout',
        })
      );
    });

    it('handles non-Error exceptions gracefully', async () => {
      createClientMock.mockImplementation(() => {
        throw 'String error';
      });

      const result =
        await activityLogService.getUserActivityHistory('user-123');

      expect(result).toEqual([]);
      expect(logMock.error).toHaveBeenCalledWith(
        'Exception while fetching user activity history',
        expect.objectContaining({
          error: 'Unknown error',
        })
      );
    });
  });

  describe('getFailedLoginAttempts', () => {
    it('returns count of failed login attempts in last 30 minutes by default', async () => {
      const supabase = createSupabaseMock();
      const countQuery = createQueryMock({ data: null, error: null, count: 5 });
      supabase.from.mockReturnValue(countQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

      const result = await activityLogService.getFailedLoginAttempts();

      expect(result).toBe(5);
      expect(supabase.from).toHaveBeenCalledWith('user_activity_logs');
      expect(countQuery.select).toHaveBeenCalledWith('*', {
        count: 'exact',
        head: true,
      });
      expect(countQuery.eq).toHaveBeenCalledWith(
        'activity_type',
        'LOGIN_FAILED'
      );
      expect(countQuery.gte).toHaveBeenCalledWith(
        'created_at',
        '2025-01-15T11:30:00.000Z'
      );
    });

    it('uses custom sinceMinutes parameter', async () => {
      const supabase = createSupabaseMock();
      const countQuery = createQueryMock({
        data: null,
        error: null,
        count: 10,
      });
      supabase.from.mockReturnValue(countQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

      const result = await activityLogService.getFailedLoginAttempts(60);

      expect(result).toBe(10);
      expect(countQuery.gte).toHaveBeenCalledWith(
        'created_at',
        '2025-01-15T11:00:00.000Z'
      );
    });

    it('returns 0 when database error occurs', async () => {
      const supabase = createSupabaseMock();
      const countQuery = createQueryMock({
        data: null,
        error: { message: 'Count failed' },
        count: null,
      });
      supabase.from.mockReturnValue(countQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.getFailedLoginAttempts();

      expect(result).toBe(0);
      expect(logMock.error).toHaveBeenCalledWith(
        'Failed to fetch failed login attempts',
        expect.objectContaining({ error: 'Count failed' })
      );
    });

    it('returns 0 when count is null', async () => {
      const supabase = createSupabaseMock();
      const countQuery = createQueryMock({
        data: null,
        error: null,
        count: null,
      });
      supabase.from.mockReturnValue(countQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.getFailedLoginAttempts();

      expect(result).toBe(0);
    });

    it('returns 0 when exception is thrown', async () => {
      createClientMock.mockImplementation(() => {
        throw new Error('Database unavailable');
      });

      const result = await activityLogService.getFailedLoginAttempts();

      expect(result).toBe(0);
      expect(logMock.error).toHaveBeenCalledWith(
        'Exception while fetching failed login attempts',
        expect.objectContaining({ error: 'Database unavailable' })
      );
    });

    it('handles non-Error exceptions', async () => {
      createClientMock.mockImplementation(() => {
        throw { custom: 'error' };
      });

      const result = await activityLogService.getFailedLoginAttempts();

      expect(result).toBe(0);
      expect(logMock.error).toHaveBeenCalledWith(
        'Exception while fetching failed login attempts',
        expect.objectContaining({ error: 'Unknown error' })
      );
    });
  });

  describe('cleanupOldActivityLogs', () => {
    it('deletes logs older than default 90 days and returns count', async () => {
      const supabase = createSupabaseMock();
      const deleteQuery = createQueryMock({
        data: [{ id: '1' }, { id: '2' }, { id: '3' }],
        error: null,
      });
      supabase.from.mockReturnValue(deleteQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      vi.setSystemTime(new Date('2025-04-01T00:00:00Z'));

      const result = await activityLogService.cleanupOldActivityLogs();

      expect(result).toBe(3);
      expect(supabase.from).toHaveBeenCalledWith('user_activity_logs');
      expect(deleteQuery.delete).toHaveBeenCalled();
      expect(deleteQuery.lt).toHaveBeenCalledWith(
        'created_at',
        '2025-01-01T00:00:00.000Z'
      );
      expect(deleteQuery.select).toHaveBeenCalledWith('id');
      expect(logMock.info).toHaveBeenCalledWith(
        'Cleaned up old activity logs',
        expect.objectContaining({
          retentionDays: 90,
          deletedCount: 3,
        })
      );
    });

    it('uses custom retention period (30 days)', async () => {
      const supabase = createSupabaseMock();
      const deleteQuery = createQueryMock({
        data: [{ id: '1' }],
        error: null,
      });
      supabase.from.mockReturnValue(deleteQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      vi.setSystemTime(new Date('2025-02-01T00:00:00Z'));

      const result = await activityLogService.cleanupOldActivityLogs(30);

      expect(result).toBe(1);
      expect(deleteQuery.lt).toHaveBeenCalledWith(
        'created_at',
        '2025-01-02T00:00:00.000Z'
      );
    });

    it('uses custom retention period (60 days)', async () => {
      const supabase = createSupabaseMock();
      const deleteQuery = createQueryMock({ data: [], error: null });
      supabase.from.mockReturnValue(deleteQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      vi.setSystemTime(new Date('2025-03-15T12:00:00Z'));

      await activityLogService.cleanupOldActivityLogs(60);

      expect(deleteQuery.lt).toHaveBeenCalledWith(
        'created_at',
        '2025-01-14T12:00:00.000Z'
      );
    });

    it('uses custom retention period (180 days)', async () => {
      const supabase = createSupabaseMock();
      const deleteQuery = createQueryMock({ data: [], error: null });
      supabase.from.mockReturnValue(deleteQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      vi.setSystemTime(new Date('2025-07-01T00:00:00Z'));

      await activityLogService.cleanupOldActivityLogs(180);

      expect(deleteQuery.lt).toHaveBeenCalledWith(
        'created_at',
        '2025-01-02T00:00:00.000Z'
      );
    });

    it('returns 0 when no old logs exist', async () => {
      const supabase = createSupabaseMock();
      const deleteQuery = createQueryMock({ data: [], error: null });
      supabase.from.mockReturnValue(deleteQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.cleanupOldActivityLogs();

      expect(result).toBe(0);
    });

    it('handles retentionDays = 0 (deletes all logs)', async () => {
      const supabase = createSupabaseMock();
      const deleteQuery = createQueryMock({
        data: Array(100)
          .fill(null)
          .map((_, i) => ({ id: `${i}` })),
        error: null,
      });
      supabase.from.mockReturnValue(deleteQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      vi.setSystemTime(new Date('2025-01-15T00:00:00Z'));

      const result = await activityLogService.cleanupOldActivityLogs(0);

      expect(result).toBe(100);
      expect(deleteQuery.lt).toHaveBeenCalledWith(
        'created_at',
        '2025-01-15T00:00:00.000Z'
      );
    });

    it('handles retentionDays = 1 (boundary condition)', async () => {
      const supabase = createSupabaseMock();
      const deleteQuery = createQueryMock({ data: [{ id: '1' }], error: null });
      supabase.from.mockReturnValue(deleteQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

      const result = await activityLogService.cleanupOldActivityLogs(1);

      expect(result).toBe(1);
      expect(deleteQuery.lt).toHaveBeenCalledWith(
        'created_at',
        '2025-01-14T12:00:00.000Z'
      );
    });

    it('handles very large retentionDays (3650 - 10 years)', async () => {
      const supabase = createSupabaseMock();
      const deleteQuery = createQueryMock({ data: [], error: null });
      supabase.from.mockReturnValue(deleteQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      vi.setSystemTime(new Date('2025-01-15T00:00:00Z'));

      await activityLogService.cleanupOldActivityLogs(3650);

      // 3650 days back from 2025-01-15 is approximately 2015-01-16
      expect(deleteQuery.lt).toHaveBeenCalled();
    });

    it('returns 0 when database delete fails and logs error', async () => {
      const supabase = createSupabaseMock();
      const deleteQuery = createQueryMock({
        data: null,
        error: { message: 'Delete permission denied' },
      });
      supabase.from.mockReturnValue(deleteQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.cleanupOldActivityLogs();

      expect(result).toBe(0);
      expect(logMock.error).toHaveBeenCalledWith(
        'Failed to cleanup old activity logs',
        expect.objectContaining({
          retentionDays: 90,
          error: 'Delete permission denied',
        })
      );
    });

    it('returns 0 when data is null (no records deleted)', async () => {
      const supabase = createSupabaseMock();
      const deleteQuery = createQueryMock({ data: null, error: null });
      supabase.from.mockReturnValue(deleteQuery);
      createClientMock.mockReturnValue(supabase as unknown);

      const result = await activityLogService.cleanupOldActivityLogs();

      expect(result).toBe(0);
    });

    it('returns 0 when exception is thrown and logs error', async () => {
      createClientMock.mockImplementation(() => {
        throw new Error('Cleanup interrupted');
      });

      const result = await activityLogService.cleanupOldActivityLogs();

      expect(result).toBe(0);
      expect(logMock.error).toHaveBeenCalledWith(
        'Exception while cleaning up activity logs',
        expect.objectContaining({
          retentionDays: 90,
          error: 'Cleanup interrupted',
        })
      );
    });

    it('handles non-Error exceptions', async () => {
      createClientMock.mockImplementation(() => {
        throw 42;
      });

      const result = await activityLogService.cleanupOldActivityLogs();

      expect(result).toBe(0);
      expect(logMock.error).toHaveBeenCalledWith(
        'Exception while cleaning up activity logs',
        expect.objectContaining({
          error: 'Unknown error',
        })
      );
    });
  });
});
