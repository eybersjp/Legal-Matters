import { describe, it, expect, vi, beforeEach } from 'vitest';
import { closeMatter, createMatter } from '../server/actions/matter.actions';
import { getMatterTasks, createMatterTask, updateTaskStatus, deleteTask } from '../server/actions/task.actions';
import { getMatterDeadlines, markDeadlineComplete, escalateOverdueDeadline, createCourtDeadline } from '../server/actions/deadline.actions';
import { getMatterExpenses, recordExpense, recordPayment, getMatterInvoices, getMatterPayments } from '../server/actions/billing.actions';
import { getMatterTimeEntries, recordTimeEntry } from '../server/actions/time.actions';
import { addTimelineEvent } from '../server/actions/timeline.actions';
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

describe('Security Regression & Tenant Isolation Tests', () => {
  const FIRM_A_UUID = '11111111-1111-1111-1111-111111111111';
  const MATTER_A_UUID = '33333333-3333-3333-3333-333333333333';
  const MATTER_B_UUID = '44444444-4444-4444-4444-444444444444';
  const CLIENT_B_UUID = '66666666-6666-6666-6666-666666666666';
  const TASK_B_UUID = '77777777-7777-7777-7777-777777777777';
  const DEADLINE_B_UUID = '88888888-8888-8888-8888-888888888888';
  const INVOICE_B_UUID = '99999999-9999-9999-9999-999999999999';
  const USER_A_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const mockAuthUser = {
    userId: USER_A_UUID,
    firmId: FIRM_A_UUID,
    role: 'Partner'
  };

  const validClosureData = {
    closure_reason: 'The case has settled and final payments are received.',
    client_communication_status: 'Notified' as const,
    document_archive_status: 'Archived' as const,
    data_retention_confirmed: true,
  };

  let mockSupabase: any;
  let queryLog: string[] = [];
  let updateLog: { table: string; data: any }[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthUser).mockResolvedValue(mockAuthUser as any);
    queryLog = [];
    updateLog = [];

    mockSupabase = {
      from: vi.fn().mockImplementation((table) => {
        queryLog.push(table);
        return mockSupabase;
      }),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockImplementation(() => {
        return Promise.resolve({ data: { id: 'new-id' }, error: null });
      }),
      update: vi.fn().mockImplementation((data) => {
        const currentTable = queryLog[queryLog.length - 1];
        updateLog.push({ table: currentTable, data });
        return mockSupabase;
      }),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      then: vi.fn().mockImplementation((resolve) => resolve({ data: [], error: null }))
    };

    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);
  });

  describe('1. Cross-Firm Matter Access Blocks', () => {
    it('blocks Firm A from retrieving tasks of Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      await expect(getMatterTasks(MATTER_B_UUID)).rejects.toThrow('Access denied');
    });

    it('blocks Firm A from creating a task on Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await createMatterTask({
        matter_id: MATTER_B_UUID,
        title: 'File plea',
        due_date: new Date().toISOString()
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks Firm A from updating task status on Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await updateTaskStatus(TASK_B_UUID, 'Completed');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks Firm A from deleting a task on Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await deleteTask(TASK_B_UUID);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks Firm A from retrieving deadlines of Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      await expect(getMatterDeadlines(MATTER_B_UUID)).rejects.toThrow('Access denied');
    });

    it('blocks Firm A from marking deadline complete on Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await markDeadlineComplete(DEADLINE_B_UUID, true);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks Firm A from escalating a deadline on Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await escalateOverdueDeadline(DEADLINE_B_UUID);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks Firm A from retrieving expenses of Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      await expect(getMatterExpenses(MATTER_B_UUID)).rejects.toThrow('Access denied');
    });

    it('blocks Firm A from recording expense against Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await recordExpense({
        matter_id: MATTER_B_UUID,
        amount_zar: 500,
        description: 'Sheriff fees'
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks Firm A from recording payment against Firm B invoice', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await recordPayment({
        invoice_id: INVOICE_B_UUID,
        amount_paid: 2000,
        payment_method: 'EFT',
        transaction_reference: 'EFT-7766'
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks Firm A from retrieving time entries of Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      await expect(getMatterTimeEntries(MATTER_B_UUID)).rejects.toThrow('Access denied');
    });

    it('blocks Firm A from retrieving invoices of Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      await expect(getMatterInvoices(MATTER_B_UUID)).rejects.toThrow('Access denied');
    });

    it('blocks Firm A from retrieving payments of Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      await expect(getMatterPayments(MATTER_B_UUID)).rejects.toThrow('Access denied');
    });

    it('blocks closeMatter for wrong-firm matter before closure checks', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await closeMatter(MATTER_B_UUID, validClosureData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks Firm A from adding timeline event on Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await addTimelineEvent({
        matterId: MATTER_B_UUID,
        title: 'Pleading event',
        eventDate: new Date().toISOString()
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });
  });

  describe('2. Cross-Firm Linkage Protection', () => {
    it('blocks Firm A from creating a matter linked to a Firm B client', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await createMatter({
        client_id: CLIENT_B_UUID,
        title: 'New Matter',
        court_jurisdiction: 'Gauteng High Court'
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks Firm A from recording time on a Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await recordTimeEntry({
        matter_id: MATTER_B_UUID,
        duration_minutes: 60,
        hourly_rate_zar: 1500,
        description: 'Consultation'
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks Firm A from creating a deadline on a Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await createCourtDeadline({
        matterId: MATTER_B_UUID,
        title: 'Filing deadline',
        triggerEvent: 'Summons served',
        triggerDate: new Date().toISOString(),
        courtDaysCount: 10
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks Firm A from adding a timeline event to a Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await addTimelineEvent({
        matterId: MATTER_B_UUID,
        title: 'Filing event',
        eventDate: new Date().toISOString()
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks Firm A from recording an expense against a Firm B matter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await recordExpense({
        matter_id: MATTER_B_UUID,
        amount_zar: 1000,
        description: 'Advocate fee'
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks Firm A from recording payment against a Firm B invoice', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await recordPayment({
        invoice_id: INVOICE_B_UUID,
        amount_paid: 500,
        payment_method: 'EFT',
        transaction_reference: 'EFT-B'
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });
  });

  describe('3. Destructive or Status-Changing Actions', () => {
    it('blocks task delete for wrong-firm task', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await deleteTask(TASK_B_UUID);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks task completion updates for wrong-firm task', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await updateTaskStatus(TASK_B_UUID, 'Completed');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks deadline completion for wrong-firm deadline', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await markDeadlineComplete(DEADLINE_B_UUID, true);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks deadline escalation for wrong-firm deadline', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await escalateOverdueDeadline(DEADLINE_B_UUID);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks payment recording for wrong-firm invoice', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await recordPayment({
        invoice_id: INVOICE_B_UUID,
        amount_paid: 150,
        payment_method: 'EFT',
        transaction_reference: 'EFT-1'
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('blocks cross-firm invoice payment and does not update invoice status', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await recordPayment({
        invoice_id: INVOICE_B_UUID,
        amount_paid: 1000,
        payment_method: 'EFT',
        transaction_reference: 'EFT-X'
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
      // Assert that no invoice status update occurred
      const invoiceUpdates = updateLog.filter(log => log.table === 'invoices');
      expect(invoiceUpdates.length).toBe(0);
    });
  });

  describe('4. Closure Compliance and Security Gates', () => {
    beforeEach(() => {
      // Setup successful matter owner response
      mockSupabase.single.mockResolvedValue({
        data: { id: MATTER_A_UUID, title: 'Commercial litigation', status: 'Intake' },
        error: null
      });
    });

    it('blocks closeMatter if the matter is already Closed', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: MATTER_A_UUID, title: 'Litigation', status: 'Closed' },
        error: null
      });
      const res = await closeMatter(MATTER_A_UUID, validClosureData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('already closed or archived');
    });

    it('blocks closeMatter if the matter is Archived', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: MATTER_A_UUID, title: 'Litigation', status: 'Archived' },
        error: null
      });
      const res = await closeMatter(MATTER_A_UUID, validClosureData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('already closed or archived');
    });

    it('blocks closeMatter because of incomplete tasks', async () => {
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })); // unbilled time
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })); // unbilled expenses
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: 'task-1' }], error: null })); // incomplete tasks

      const res = await closeMatter(MATTER_A_UUID, validClosureData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Open tasks remain unresolved');
    });

    it('blocks closeMatter because of open deadlines', async () => {
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })); // unbilled time
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })); // unbilled expenses
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })); // incomplete tasks
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: 'dl-1' }], error: null })); // incomplete deadlines

      const res = await closeMatter(MATTER_A_UUID, validClosureData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Open deadlines remain unresolved');
    });

    it('blocks closeMatter because of unpaid invoices', async () => {
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })); // unbilled time
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })); // unbilled expenses
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })); // incomplete tasks
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })); // incomplete deadlines
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: 'inv-1', status: 'Issued' }], error: null })); // unpaid invoices

      const res = await closeMatter(MATTER_A_UUID, validClosureData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unpaid or outstanding invoices exist');
    });

    it('blocks closeMatter because of unbilled time', async () => {
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: 'te-1' }], error: null })); // unbilled time

      const res = await closeMatter(MATTER_A_UUID, validClosureData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unbilled time entries exist');
    });

    it('blocks closeMatter because of unbilled expenses', async () => {
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })); // unbilled time
      mockSupabase.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: 'ex-1' }], error: null })); // unbilled expenses

      const res = await closeMatter(MATTER_A_UUID, validClosureData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unbilled expenses exist');
    });

    it('blocks closeMatter because of missing closure required fields', async () => {
      const invalidData = { ...validClosureData, closure_reason: 'Short' }; // Less than 10 characters
      const res = await closeMatter(MATTER_A_UUID, invalidData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('minimum 10 characters');
    });
  });

  describe('5. Audit and Timeline Integrity Gates', () => {
    it('does not create timeline or audit records when unauthorized closure fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
      const res = await closeMatter(MATTER_B_UUID, validClosureData);
      expect(res.success).toBe(false);

      // Verify no insertions were made to timeline or audit log tables
      const hasTimelineInsert = queryLog.includes('matter_events');
      const hasAuditInsert = queryLog.includes('audit_logs');
      expect(hasTimelineInsert).toBe(false);
      expect(hasAuditInsert).toBe(false);
    });

    it('writes timeline and audit records when authorized closure succeeds', async () => {
      // Setup successful checks
      mockSupabase.single.mockResolvedValue({
        data: { id: MATTER_A_UUID, title: 'Commercial litigation', status: 'Intake' },
        error: null
      });
      // All compliance queries return empty lists (success)
      mockSupabase.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));

      const res = await closeMatter(MATTER_A_UUID, validClosureData);
      expect(res.success).toBe(true);

      // Verify updates and insertions
      const hasTimelineInsert = queryLog.includes('matter_events');
      const hasAuditInsert = queryLog.includes('audit_logs');
      expect(hasTimelineInsert).toBe(true);
      expect(hasAuditInsert).toBe(true);

      // Verify matter status update
      const matterUpdates = updateLog.filter(log => log.table === 'matters');
      expect(matterUpdates.length).toBe(1);
      expect(matterUpdates[0].data.status).toBe('Closed');
    });
  });
});
