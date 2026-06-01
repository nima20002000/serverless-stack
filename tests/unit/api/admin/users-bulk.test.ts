import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { bulkDeleteUsers, bulkUpdateUsers } from '@/services/admin-service';
import { createClient } from '@/lib/supabase/server';
import {
  createSupabaseMock,
  createQueryMock,
} from '../../helpers/supabase-mock';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/admin-service', () => ({
  bulkDeleteUsers: vi.fn(),
  bulkUpdateUsers: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('POST /api/admin/users/bulk', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const bulkDeleteUsersMock = vi.mocked(bulkDeleteUsers);
  const bulkUpdateUsersMock = vi.mocked(bulkUpdateUsers);
  const createClientMock = vi.mocked(createClient);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@example.com',
    },
  };

  const createPostRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/admin/users/bulk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/users/bulk/route');
    return { POST: handlers.POST };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { POST } = await loadHandlers();

    const response = await POST(createPostRequest({ action: 'delete' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(bulkDeleteUsersMock).not.toHaveBeenCalled();
  });

  it('returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { POST } = await loadHandlers();

    const response = await POST(createPostRequest({ action: 'delete' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(bulkDeleteUsersMock).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid action', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(createPostRequest({ action: 'archive' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid bulk action',
    });
  });

  it('returns 400 when delete userIds are invalid', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ action: 'delete', userIds: [] })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'User IDs are required',
    });
    expect(bulkDeleteUsersMock).not.toHaveBeenCalled();
  });

  it('returns 400 when delete finds no users', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    bulkDeleteUsersMock.mockResolvedValue({ count: 0 });
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ action: 'delete', userIds: ['u1'] })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'No users were found to delete',
    });
  });

  it('deletes users in bulk', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    bulkDeleteUsersMock.mockResolvedValue({ count: 2 });
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ action: 'delete', userIds: ['u1', 'u2'] })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: '2 users deleted successfully',
      count: 2,
    });
    expect(bulkDeleteUsersMock).toHaveBeenCalledWith(['u1', 'u2']);
  });

  it('returns 400 when delete service throws', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    bulkDeleteUsersMock.mockRejectedValue(new Error('delete failed'));
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ action: 'delete', userIds: ['u1'] })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'delete failed' });
  });

  it('returns 400 when update userIds are invalid', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ action: 'update', userIds: [], updates: {} })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'User IDs are required',
    });
    expect(bulkUpdateUsersMock).not.toHaveBeenCalled();
  });

  it('returns 400 when update payload is empty', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ action: 'update', userIds: ['u1'], updates: {} })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid update action',
    });
    expect(bulkUpdateUsersMock).not.toHaveBeenCalled();
  });

  it('blocks self-demotion in bulk role updates', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({
        action: 'update',
        userIds: ['admin-1', 'user-2'],
        updates: { role: 'USER' },
      })
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('You cannot change your own role');
    expect(bulkUpdateUsersMock).not.toHaveBeenCalled();
  });

  it('blocks bulk demotion of admin users', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);

    const supabase = createSupabaseMock();
    const adminCheckQuery = createQueryMock({
      data: [{ id: 'admin-2' }],
      error: null,
    });
    supabase.from.mockReturnValueOnce(adminCheckQuery);
    createClientMock.mockReturnValue(supabase as any);

    const { POST } = await loadHandlers();
    const response = await POST(
      createPostRequest({
        action: 'update',
        userIds: ['admin-2', 'user-2'],
        updates: { role: 'USER' },
      })
    );

    expect(adminCheckQuery.in).toHaveBeenCalledWith('id', [
      'admin-2',
      'user-2',
    ]);
    expect(adminCheckQuery.eq).toHaveBeenCalledWith('role', 'ADMIN');
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('Admin roles cannot be changed in bulk');
    expect(bulkUpdateUsersMock).not.toHaveBeenCalled();
  });

  it('updates users in bulk when no admin targets are present', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);

    const supabase = createSupabaseMock();
    const adminCheckQuery = createQueryMock({
      data: [],
      error: null,
    });
    supabase.from.mockReturnValueOnce(adminCheckQuery);
    createClientMock.mockReturnValue(supabase as any);
    bulkUpdateUsersMock.mockResolvedValue({ count: 2 });

    const { POST } = await loadHandlers();
    const response = await POST(
      createPostRequest({
        action: 'update',
        userIds: ['user-1', 'user-2'],
        updates: { role: 'USER' },
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.count).toBe(2);
    expect(bulkUpdateUsersMock).toHaveBeenCalledWith(['user-1', 'user-2'], {
      role: 'USER',
    });
  });

  it('updates users in bulk', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    bulkUpdateUsersMock.mockResolvedValue({ count: 3 });
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({
        action: 'update',
        userIds: ['u1', 'u2', 'u3'],
        updates: { role: 'ADMIN' },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: '3 users updated successfully',
      count: 3,
    });
    expect(bulkUpdateUsersMock).toHaveBeenCalledWith(['u1', 'u2', 'u3'], {
      role: 'ADMIN',
    });
  });

  it('returns 400 when update service throws', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    bulkUpdateUsersMock.mockRejectedValue(new Error('update failed'));
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({
        action: 'update',
        userIds: ['u1'],
        updates: { role: 'ADMIN' },
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'update failed' });
  });
});
