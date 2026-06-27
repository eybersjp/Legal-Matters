import { describe, it, expect, vi, beforeEach } from 'vitest';
import { closeMatter } from '../server/actions/matter.actions';
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

describe('Matter OS Server Actions - closeMatter', () => {
  const mockAuthUser = {
    userId: 'user-partner-123',
    firmId: 'firm-jhb-456',
    role: 'Partner'
  };

  const validClosureData = {
    closure_reason: 'The case has settled and final payments are received.',
    client_communication_status: 'Notified' as const,
    document_archive_status: 'Archived' as const,
    data_retention_confirmed: true,
  };

  let mockSupabase: any;
  let activeTable = '';
  let mockUnbilledTime: any[] = [];
  let mockUnbilledExpenses: any[] = [];
  let mockOpenTasks: any[] = [];
  let mockOpenDeadlines: any[] = [];
  let mockUnpaidInvoices: any[] = [];
  let mockMatterData: any = null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthUser).mockResolvedValue(mockAuthUser as any);

    activeTable = '';
    mockUnbilledTime = [];
    mockUnbilledExpenses = [];
    mockOpenTasks = [];
    mockOpenDeadlines = [];
    mockUnpaidInvoices = [];
    mockMatterData = { id: 'matter-123', title: 'Commercial Contract Audit', status: 'Intake' };

    mockSupabase = {
      from: vi.fn().mockImplementation((table) => {
        activeTable = table;
        return mockSupabase;
      }),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => {
        if (activeTable === 'matters') {
          return Promise.resolve({ data: mockMatterData, error: mockMatterData ? null : { message: 'Not found' } });
        }
        return Promise.resolve({ data: { id: 'some-id' }, error: null });
      }),
      then: vi.fn().mockImplementation((resolve) => {
        let data: any[] = [];
        if (activeTable === 'time_entries') data = mockUnbilledTime;
        else if (activeTable === 'expenses') data = mockUnbilledExpenses;
        else if (activeTable === 'matter_tasks') data = mockOpenTasks;
        else if (activeTable === 'matter_deadlines') data = mockOpenDeadlines;
        else if (activeTable === 'invoices') data = mockUnpaidInvoices;
        return resolve({ data, error: null });
      })
    };

    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);
  });

  it('should reject closure if matter belongs to a different firm', async () => {
    // Simulate matter not found / foreign firm
    mockMatterData = null;

    const res = await closeMatter('foreign-matter-uuid', validClosureData);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Access denied');
  });

  it('should reject closure if matter is already closed', async () => {
    mockMatterData = { id: 'matter-123', title: 'Closed Case', status: 'Closed' };

    const res = await closeMatter('matter-123', validClosureData);
    expect(res.success).toBe(false);
    expect(res.error).toContain('already closed');
  });

  it('should reject closure if unbilled time entries exist', async () => {
    mockUnbilledTime = [{ id: 'time-entry-1' }];

    const res = await closeMatter('matter-123', validClosureData);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Unbilled time entries exist');
  });

  it('should reject closure if unbilled expenses exist', async () => {
    mockUnbilledExpenses = [{ id: 'exp-1' }];

    const res = await closeMatter('matter-123', validClosureData);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Unbilled expenses exist');
  });

  it('should reject closure if incomplete tasks exist', async () => {
    mockOpenTasks = [{ id: 'task-1' }];

    const res = await closeMatter('matter-123', validClosureData);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Open tasks remain unresolved');
  });

  it('should reject closure if open deadlines exist', async () => {
    mockOpenDeadlines = [{ id: 'dl-1' }];

    const res = await closeMatter('matter-123', validClosureData);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Open deadlines remain unresolved');
  });

  it('should reject closure if unpaid/outstanding invoices exist', async () => {
    mockUnpaidInvoices = [{ id: 'inv-1', status: 'Issued' }];

    const res = await closeMatter('matter-123', validClosureData);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Unpaid or outstanding invoices exist');
  });

  it('should reject closure if matter is archived', async () => {
    mockMatterData = { id: 'matter-123', title: 'Archived Case', status: 'Archived' };

    const res = await closeMatter('matter-123', validClosureData);
    expect(res.success).toBe(false);
    expect(res.error).toContain('already closed or archived');
  });

  it('should succeed to close matter if all validation gates are satisfied', async () => {
    const res = await closeMatter('matter-123', validClosureData);
    expect(res.success).toBe(true);

    // Verify timeline and audit logs insertions
    expect(mockSupabase.from).toHaveBeenCalledWith('matter_events');
    expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');

    const insertCalls = vi.mocked(mockSupabase.insert).mock.calls;
    const hasTimelineEvent = insertCalls.some(([payload]: any) => 
      payload.title === 'Matter Closed' && 
      payload.matter_id === 'matter-123'
    );
    expect(hasTimelineEvent).toBe(true);

    const hasAuditLog = insertCalls.some(([payload]: any) => 
      payload.action === 'CLOSE_MATTER' && 
      payload.resource_id === 'matter-123'
    );
    expect(hasAuditLog).toBe(true);
  });
});
