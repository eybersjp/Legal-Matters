import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMatterDeadlines, markDeadlineComplete, escalateOverdueDeadline } from '../server/actions/deadline.actions';
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

describe('Deadline Server Actions', () => {
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
      single: vi.fn(),
      then: vi.fn((resolve) => resolve({ data: null, error: null }))
    };

    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);
  });

  describe('getMatterDeadlines', () => {
    it('should retrieve deadlines successfully if owned by practitioner firm', async () => {
      // 1. Matter check passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'matter-123' },
        error: null
      });
      // 2. Fetch deadlines succeeds
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          {
            id: 'dl-123',
            matter_id: 'matter-123',
            title: 'File Plea',
            calculated_deadline: '2026-06-20T17:00:00Z',
            is_completed: false
          }
        ],
        error: null
      });

      const res = await getMatterDeadlines('matter-123');
      expect(res.length).toBe(1);
      expect(res[0].title).toBe('File Plea');
    });

    it('should reject deadline retrieval if matter belongs to a different firm', async () => {
      // Matter check fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      await expect(getMatterDeadlines('foreign-matter-uuid')).rejects.toThrow('Access denied: Matter not found');
    });
  });

  describe('markDeadlineComplete', () => {
    it('should complete deadline successfully', async () => {
      // 1. Deadline ownership check passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'dl-123', title: 'File Plea', matter_id: 'matter-123' },
        error: null
      });

      const res = await markDeadlineComplete('dl-123', true);
      expect(res.success).toBe(true);
    });

    it('should reject completion if deadline does not belong to practitioner firm', async () => {
      // Deadline ownership query fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      const res = await markDeadlineComplete('dl-123', true);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied: Deadline not found');
    });
  });

  describe('escalateOverdueDeadline', () => {
    it('should escalate overdue deadline successfully and alert Partner roles', async () => {
      // 1. Deadline ownership query passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'dl-123', title: 'File Plea', matter_id: 'matter-123', calculated_deadline: '2026-06-10T17:00:00Z', is_completed: false },
        error: null
      });
      // 2. Fetch Partners query succeeds via thenable resolution
      mockSupabase.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ id: 'partner-uuid-1' }], error: null })
      );

      const res = await escalateOverdueDeadline('dl-123');
      expect(res.success).toBe(true);
    });

    it('should reject escalation if deadline does not belong to practitioner firm', async () => {
      // Deadline query fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      const res = await escalateOverdueDeadline('dl-123');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied: Deadline not found');
    });
  });
});
