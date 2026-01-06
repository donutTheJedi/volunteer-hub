import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'opportunities') {
        return {
          select: () => ({ gte: () => ({ lte: () => ({ eq: () => ({ data: [{ id: 'o1', title: 'Opp', start_time: new Date().toISOString(), end_time: new Date(Date.now()+3600000).toISOString(), location: 'Park', org_id: 'org1', closed: false }], error: null }) }) }) })
        } as any;
      }
      if (table === 'signups') {
        return { select: () => ({ eq: () => ({ data: [{ user_id: 'u1', name: 'A' }], error: null }) }) } as any;
      }
      if (table === 'organizations') {
        return { select: () => ({ eq: () => ({ single: () => ({ data: { name: 'Org', owner: 'owner', contact_email: 'org@example.com' }, error: null }) }) }) } as any;
      }
      return {} as any;
    },
  },
}));

describe('POST /api/send-rollcall-emails', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('processes rollcall emails without throwing and returns counts', async () => {
    const { POST } = await import('@/app/api/send-rollcall-emails/route');
    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.emailsSent).toBeGreaterThanOrEqual(1);
  });
});

