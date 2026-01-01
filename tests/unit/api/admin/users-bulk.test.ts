/**
 * Admin Users Bulk API Route Tests
 *
 * Tests for src/app/api/admin/users/bulk/route.ts
 * Focuses on authorization and safety guards for bulk role updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
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

import { getServerSession } from 'next-auth';
import { bulkUpdateUsers } from '@/services/admin-service';
import { createClient } from '@/lib/supabase/server';

describe('POST /api/admin/users/bulk', () => {
  const createClientMock = vi.mocked(createClient);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function getHandler() {
    const { POST } = await import('@/app/api/admin/users/bulk/route');
    return POST;
  }

  it('blocks self-demotion in bulk role updates', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });

    const POST = await getHandler();
    const req = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        userIds: ['admin-1', 'user-2'],
        updates: { role: 'USER' },
      }),
    });

    const response = await POST(req);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('نمی‌توانید نقش خود را تغییر دهید');
    expect(bulkUpdateUsers).not.toHaveBeenCalled();
  });

  it('blocks bulk demotion of admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });

    const supabase = createSupabaseMock();
    const adminCheckQuery = createQueryMock({
      data: [{ id: 'admin-2' }],
      error: null,
    });
    supabase.from.mockReturnValueOnce(adminCheckQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const POST = await getHandler();
    const req = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        userIds: ['admin-2', 'user-2'],
        updates: { role: 'USER' },
      }),
    });

    const response = await POST(req);

    expect(adminCheckQuery.in).toHaveBeenCalledWith('id', [
      'admin-2',
      'user-2',
    ]);
    expect(adminCheckQuery.eq).toHaveBeenCalledWith('role', 'ADMIN');
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('امکان تغییر نقش مدیران به کاربر وجود ندارد');
    expect(bulkUpdateUsers).not.toHaveBeenCalled();
  });

  it('allows bulk updates when no admin targets are present', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });

    const supabase = createSupabaseMock();
    const adminCheckQuery = createQueryMock({
      data: [],
      error: null,
    });
    supabase.from.mockReturnValueOnce(adminCheckQuery);
    createClientMock.mockReturnValue(supabase as unknown);
    vi.mocked(bulkUpdateUsers).mockResolvedValue({ count: 2 });

    const POST = await getHandler();
    const req = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        userIds: ['user-1', 'user-2'],
        updates: { role: 'USER' },
      }),
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.count).toBe(2);
    expect(bulkUpdateUsers).toHaveBeenCalledWith(['user-1', 'user-2'], {
      role: 'USER',
    });
  });
});
