import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllSettings,
  getSetting,
  updateSettings,
  deleteSetting,
} from '@/services/settings-service';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseMock, createQueryMock } from '../helpers/supabase-mock';

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

describe('settings-service', () => {
  const createClientMock = vi.mocked(createClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty list when settings table is empty', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({ data: null, error: null });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as any);

    const result = await getAllSettings();

    expect(result).toEqual([]);
  });

  it('returns null when setting does not exist', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({
      data: null,
      error: { code: 'PGRST116' },
    });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as any);

    const result = await getSetting('missing');

    expect(result).toBeNull();
  });

  it('updates existing settings and inserts new ones', async () => {
    const supabase = createSupabaseMock();

    const selectExisting = createQueryMock({
      data: { key: 'siteName' },
      error: null,
    });
    const updateExisting = createQueryMock({ data: null, error: null });
    const selectMissing = createQueryMock({ data: null, error: null });
    const insertNew = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(selectExisting)
      .mockReturnValueOnce(selectMissing)
      .mockReturnValueOnce(updateExisting)
      .mockReturnValueOnce(insertNew);

    createClientMock.mockReturnValue(supabase as any);

    await updateSettings({
      siteName: 'Supabase Vercel Stack',
      supportEmail: 'help@example.com',
    });

    expect(updateExisting.update).toHaveBeenCalledWith({
      value: 'Supabase Vercel Stack',
    });
    expect(insertNew.insert).toHaveBeenCalledWith({
      key: 'supportEmail',
      value: 'help@example.com',
    });
  });

  it('deletes a setting by key', async () => {
    const supabase = createSupabaseMock();
    const deleteQuery = createQueryMock({ data: null, error: null });
    supabase.from.mockReturnValue(deleteQuery);
    createClientMock.mockReturnValue(supabase as any);

    await deleteSetting('obsolete');

    expect(deleteQuery.delete).toHaveBeenCalled();
    expect(deleteQuery.eq).toHaveBeenCalledWith('key', 'obsolete');
  });
});
