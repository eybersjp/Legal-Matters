import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMatterTasks, createMatterTask, updateTaskStatus, deleteTask } from '../server/actions/task.actions';
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

describe('Task OS Server Actions', () => {
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
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      then: vi.fn((resolve) => resolve({ data: null, error: null }))
    };

    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);
  });

  describe('getMatterTasks', () => {
    it('should retrieve matter tasks successfully if owned', async () => {
      // 1. Matter check passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'matter-123' },
        error: null
      });
      // 2. Fetch tasks succeeds
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          {
            id: 'task-123',
            matter_id: 'matter-123',
            title: 'Draft summons',
            status: 'Pending',
            assigned_to: null,
            due_date: '2026-06-20T17:00:00Z',
            created_at: '2026-06-12T23:00:00Z',
            firm_members: []
          }
        ],
        error: null
      });

      const res = await getMatterTasks('matter-123');
      expect(res.length).toBe(1);
      expect(res[0].title).toBe('Draft summons');
    });

    it('should reject task retrieval if matter is not owned by practitioner firm', async () => {
      // Matter check fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      await expect(getMatterTasks('foreign-matter-uuid')).rejects.toThrow('Access denied: Matter not found');
    });
  });

  describe('createMatterTask', () => {
    const validTaskInput = {
      matter_id: 'a0aa0a0a-bbbb-cccc-dddd-eeeeeeeeeeee',
      title: 'Prepare summons',
      description: 'Prepare high court summons.',
      assigned_to: 'b1bb1b1b-cccc-dddd-eeee-ffffffffffff',
      due_date: '2026-06-20T17:00:00Z',
    };

    it('should create a task successfully when matter and assignee belong to firm', async () => {
      // 1. Matter ownership query passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: validTaskInput.matter_id },
        error: null
      });
      // 2. Assignee validation query passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: validTaskInput.assigned_to },
        error: null
      });
      // 3. Insert query succeeds
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'task-new-uuid' },
        error: null
      });

      const res = await createMatterTask(validTaskInput);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.id).toBe('task-new-uuid');
      }
    });

    it('should reject task creation if matter is not owned by practitioner firm', async () => {
      // Matter ownership query fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      const res = await createMatterTask(validTaskInput);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied: Matter not found');
    });

    it('should reject task creation if assignee is from another firm', async () => {
      // 1. Matter ownership query passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: validTaskInput.matter_id },
        error: null
      });
      // 2. Assignee validation query fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Assignee not found in firm' }
      });

      const res = await createMatterTask(validTaskInput);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Assigned member not found in your firm');
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status successfully', async () => {
      // Task ownership checks passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'task-123', title: 'Prepare Summons', matter_id: 'matter-123', status: 'Pending' },
        error: null
      });

      const res = await updateTaskStatus('task-123', 'InProgress');
      expect(res.success).toBe(true);
    });

    it('should reject update if task does not belong to practitioner firm', async () => {
      // Task ownership query fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      const res = await updateTaskStatus('task-123', 'InProgress');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied: Task not found');
    });

    it('should reject invalid task status', async () => {
      const res = await updateTaskStatus('task-123', 'InvalidStatus');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid task status');
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully if owned', async () => {
      // Task ownership checks passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'task-123', title: 'Prepare Summons', matter_id: 'matter-123' },
        error: null
      });

      const res = await deleteTask('task-123');
      expect(res.success).toBe(true);
    });

    it('should reject delete if task does not belong to practitioner firm', async () => {
      // Task ownership query fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      const res = await deleteTask('task-123');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied: Task not found');
    });
  });
});
