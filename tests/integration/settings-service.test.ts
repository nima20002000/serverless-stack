/**
 * Integration Tests for Settings Service + Admin Settings API
 *
 * Validates real Supabase persistence for settings CRUD and API auth flows.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Uses real Supabase queries to assert persistence
 * - Avoids stubbing the settings service under test
 * - Exercises success + failure paths, including auth/validation errors
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { createTestSupabaseClient } from '../utils/test-client';
import {
  getAllSettings,
  getSetting,
  updateSettings,
  deleteSetting,
} from '@/services/settings-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

const supabase = createTestSupabaseClient();
const SERVICE_PREFIX = 'test-settings';
const API_PREFIX = 'test-api-settings';

function createSettingKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function cleanupTestSettings() {
  const { error } = await supabase
    .from('site_settings')
    .delete()
    .or(`key.like.${SERVICE_PREFIX}%,key.like.${API_PREFIX}%`);

  if (error && error.code !== 'PGRST116') {
    console.warn('Failed to cleanup test settings:', error);
  }
}

describe('Settings Service Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestSettings();
  });

  afterEach(async () => {
    await cleanupTestSettings();
  });

  it('should insert settings and retrieve them via service and DB', async () => {
    const keyA = createSettingKey(SERVICE_PREFIX);
    const keyB = createSettingKey(SERVICE_PREFIX);

    await updateSettings({
      [keyA]: 'value-A',
      [keyB]: 'value-B',
    });

    const settingA = await getSetting(keyA);
    expect(settingA).toEqual({ key: keyA, value: 'value-A' });

    const allSettings = await getAllSettings();
    const foundA = allSettings.find((setting) => setting.key === keyA);
    const foundB = allSettings.find((setting) => setting.key === keyB);
    expect(foundA?.value).toBe('value-A');
    expect(foundB?.value).toBe('value-B');

    const { data: stored, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .eq('key', keyA)
      .single();

    if (error) {
      throw new Error(`Failed to verify setting insert: ${error.message}`);
    }

    expect(stored).toEqual({ key: keyA, value: 'value-A' });
  });

  it('should update existing settings and persist changes', async () => {
    const key = createSettingKey(SERVICE_PREFIX);

    await updateSettings({ [key]: 'initial-value' });
    await updateSettings({ [key]: 'updated-value' });

    const updated = await getSetting(key);
    expect(updated).toEqual({ key, value: 'updated-value' });

    const { data: stored, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .eq('key', key);

    if (error) {
      throw new Error(`Failed to verify setting update: ${error.message}`);
    }

    expect(stored).toHaveLength(1);
    expect(stored?.[0]).toEqual({ key, value: 'updated-value' });
  });

  it('should delete settings and remove them from the database', async () => {
    const key = createSettingKey(SERVICE_PREFIX);

    await updateSettings({ [key]: 'to-delete' });

    await deleteSetting(key);

    const removed = await getSetting(key);
    expect(removed).toBeNull();

    const { data: stored, error } = await supabase
      .from('site_settings')
      .select('key')
      .eq('key', key);

    if (error) {
      throw new Error(`Failed to verify setting delete: ${error.message}`);
    }

    expect(stored).toHaveLength(0);
  });

  it('should return null for missing settings', async () => {
    const key = createSettingKey(SERVICE_PREFIX);

    const missing = await getSetting(key);
    expect(missing).toBeNull();
  });
});

describe('Admin Settings API Integration Tests', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const adminSession = {
    user: {
      role: 'ADMIN',
      email: 'admin@kitia.ir',
    },
  };

  const createPostRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/admin/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/settings/route');
    return { GET: handlers.GET, POST: handlers.POST };
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    await cleanupTestSettings();
  });

  afterEach(async () => {
    await cleanupTestSettings();
  });

  it('GET returns 403 for non-admin users', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);

    const { GET } = await loadHandlers();
    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'غیرمجاز' });
  });

  it('POST returns 400 for invalid settings payload', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);

    const { POST } = await loadHandlers();
    const response = await POST(createPostRequest({ settings: 'invalid' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'داده‌های نامعتبر',
    });
  });

  it('POST persists settings and GET returns them for admins', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);

    const key = createSettingKey(API_PREFIX);
    const { GET, POST } = await loadHandlers();

    const postResponse = await POST(
      createPostRequest({
        settings: {
          [key]: 'api-value',
        },
      })
    );

    expect(postResponse.status).toBe(200);
    await expect(postResponse.json()).resolves.toEqual({
      message: 'تنظیمات با موفقیت ذخیره شد',
    });

    const { data: stored, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .eq('key', key)
      .single();

    if (error) {
      throw new Error(`Failed to verify API setting insert: ${error.message}`);
    }

    expect(stored).toEqual({ key, value: 'api-value' });

    const getResponse = await GET();
    expect(getResponse.status).toBe(200);
    const payload = await getResponse.json();
    const found = payload.settings.find(
      (setting: { key: string }) => setting.key === key
    );
    expect(found?.value).toBe('api-value');
  });
});
