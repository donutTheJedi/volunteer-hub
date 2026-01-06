import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabaseServer', () => ({
  createSupabaseServer: vi.fn(),
}));

function makeRequest(body: any) {
  return new NextRequest('http://localhost/api/award-hours', {
    method: 'POST',
    body: JSON.stringify(body),
  } as any);
}

describe('POST /api/award-hours', () => {
  let createSupabaseServer: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const mod = await import('@/lib/supabaseServer');
    createSupabaseServer = mod.createSupabaseServer as any;
  });

  

  it('returns 401 when not logged in', async () => {
    createSupabaseServer.mockResolvedValue({
      auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    });

    const { POST } = await import('@/app/api/award-hours/route');
    const res = await POST(makeRequest({ opportunityId: 'opp1', hours: 1 }));
    expect(res.status).toBe(401);
  });

  it('returns 404 when opportunity not found', async () => {
    createSupabaseServer.mockResolvedValue({
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } }, error: null }) },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'not found' } }) }) }),
      }),
    });

    const { POST } = await import('@/app/api/award-hours/route');
    const res = await POST(makeRequest({ opportunityId: 'opp1', hours: 2 }));
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not org owner', async () => {
    createSupabaseServer.mockResolvedValue({
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } }, error: null }) },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { organizations: [{ owner: 'other' }] }, error: null }) }) }),
      }),
    });

    const { POST } = await import('@/app/api/award-hours/route');
    const res = await POST(makeRequest({ opportunityId: 'opp1', hours: 2 }));
    expect(res.status).toBe(403);
  });

  it('awards hours to attendees and returns counts', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });

    createSupabaseServer.mockResolvedValue({
      auth: { getSession: async () => ({ data: { session: { user: { id: 'owner1' } } }, error: null }) },
      from: (table: string) => {
        if (table === 'opportunities') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { title: 'Opp', organizations: [{ owner: 'owner1' }] },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'attendance') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  data: [{ user_id: 'a' }, { user_id: 'b' }],
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'volunteer_hours') {
          return { upsert } as any;
        }
        return {} as any;
      },
    });

    const { POST } = await import('@/app/api/award-hours/route');
    const res = await POST(makeRequest({ opportunityId: 'opp1', hours: 3 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.hoursAwarded).toBe(2);
    expect(upsert).toHaveBeenCalledTimes(2);
  });
});

