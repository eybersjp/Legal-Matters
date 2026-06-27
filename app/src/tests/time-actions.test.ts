import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMatterTimeEntries, recordTimeEntry } from '../server/actions/time.actions';
import { requireAuthUser } from '../lib/auth';
import { createAdminClient } from '../lib/supabase/server';

vi.mock('../lib/auth', () => ({
  requireAuthUser: vi.fn()
}));

vi.mock('../lib/supabase/server', () => ({
  createAdminClient: vi.fn()
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

describe('Time Actions', () => {
  const mockAuthUser = {
    userId: 'user-partner-123',
    firmId: 'firm-jhb-456',
    role: 'Partner'
  };

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthUser).mockResolvedValue(mockAuthUser as any);

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn()
    };

    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);
  });

  describe('getMatterTimeEntries', () => {
    it('should retrieve time entries successfully if owned by practitioner firm', async () => {
      // 1. Matter check passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'matter-123' },
        error: null
      });
      // 2. Fetch time entries succeeds
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          {
            id: 'entry-123',
            duration_minutes: 60,
            hourly_rate_zar: 1200,
            description: 'Drafting pleadings',
            is_billed: false,
            created_at: '2026-06-13T10:00:00Z',
            firm_members: [
              {
                user_profiles: [
                  {
                    first_name: 'John',
                    last_name: 'Doe'
                  }
                ]
              }
            ]
          }
        ],
        error: null
      });

      const res = await getMatterTimeEntries('matter-123');
      expect(res.length).toBe(1);
      expect(res[0].description).toBe('Drafting pleadings');
      expect(res[0].fee_earner).toBe('John Doe');
    });

    it('should reject retrieval if matter belongs to a different firm', async () => {
      // Matter check fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      await expect(getMatterTimeEntries('foreign-matter-uuid')).rejects.toThrow('Access denied: Matter not found');
    });
  });

  describe('recordTimeEntry', () => {
    const validTimeInput = {
      matter_id: 'a0aa0a0a-bbbb-cccc-dddd-eeeeeeeeeeee',
      duration_minutes: 90,
      hourly_rate_zar: 1500,
      description: 'Consultation with client regarding plea',
    };

    it('should record time entry successfully if owned by practitioner firm', async () => {
      // 1. Matter check passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'matter-123' },
        error: null
      });
      // 2. Insert succeeds
      mockSupabase.insert.mockResolvedValueOnce({
        error: null
      });

      const res = await recordTimeEntry(validTimeInput);
      expect(res.success).toBe(true);
    });

    it('should reject recording time if matter belongs to a different firm', async () => {
      // Matter check fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      const res = await recordTimeEntry(validTimeInput);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied: Matter not found');
    });
  });
});
