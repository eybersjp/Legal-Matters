import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMatterExpenses, recordExpense, recordPayment, getMatterInvoices, getMatterPayments } from '../server/actions/billing.actions';
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

describe('Billing Actions', () => {
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

  describe('getMatterExpenses', () => {
    it('should retrieve expenses successfully if owned by practitioner firm', async () => {
      // 1. Matter check passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'matter-123' },
        error: null
      });
      // 2. Fetch expenses succeeds
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          {
            id: 'exp-123',
            matter_id: 'matter-123',
            amount_zar: 500,
            description: 'Sheriff service',
            is_billed: false
          }
        ],
        error: null
      });

      const res = await getMatterExpenses('matter-123');
      expect(res.length).toBe(1);
      expect(res[0].description).toBe('Sheriff service');
    });

    it('should reject expense retrieval if matter belongs to a different firm', async () => {
      // Matter check fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      await expect(getMatterExpenses('foreign-matter-uuid')).rejects.toThrow('Access denied: Matter not found');
    });
  });

  describe('recordExpense', () => {
    const validExpenseInput = {
      matter_id: 'a0aa0a0a-bbbb-cccc-dddd-eeeeeeeeeeee',
      amount_zar: 350.75,
      description: 'Court filing fees for plea document',
    };

    it('should record expense successfully', async () => {
      // 1. Matter check passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'matter-123' },
        error: null
      });
      // 2. Insert expense succeeds
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'exp-123' },
        error: null
      });

      const res = await recordExpense(validExpenseInput);
      expect(res.success).toBe(true);
    });

    it('should reject recording expense if matter does not belong to practitioner firm', async () => {
      // Matter check fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      const res = await recordExpense(validExpenseInput);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied: Matter not found');
    });
  });

  describe('recordPayment', () => {
    const validPaymentInput = {
      invoice_id: 'c3cc3c3c-dddd-eeee-ffff-000000000000',
      amount_paid: 5000.00,
      payment_method: 'EFT',
      transaction_reference: 'EFT-PAY-9988',
    };

    it('should record payment successfully and mark invoice as Paid if fully settled', async () => {
      // 1. Invoice check passes (Total invoice due: R5000.00)
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'invoice-123',
          total_including_vat: 5000.00,
          invoice_number: 'INV-100',
          status: 'Issued',
          matter_id: 'matter-123'
        },
        error: null
      });
      // 2. Insert payment record passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'payment-123' },
        error: null
      });
      // 3. Fetch all payments returns total payments of R5000.00
      mockSupabase.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ amount_paid: 5000.00 }], error: null })
      );

      const res = await recordPayment(validPaymentInput);
      expect(res.success).toBe(true);
    });

    it('should reject payment if invoice does not belong to practitioner firm', async () => {
      // Invoice check fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      const res = await recordPayment(validPaymentInput);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied: Invoice not found');
    });
  });

  describe('getMatterInvoices', () => {
    it('should retrieve invoices successfully if owned by practitioner firm', async () => {
      // 1. Matter check passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'matter-123' },
        error: null
      });
      // 2. Fetch invoices succeeds
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          {
            id: 'inv-123',
            invoice_number: 'INV-100',
            total_excluding_vat: 1000,
            vat_amount: 150,
            total_including_vat: 1150,
            status: 'Issued',
            due_date: '2026-07-01',
            created_at: '2026-06-01'
          }
        ],
        error: null
      });

      const res = await getMatterInvoices('matter-123');
      expect(res.length).toBe(1);
      expect(res[0].invoice_number).toBe('INV-100');
    });

    it('should reject invoice retrieval if matter belongs to a different firm', async () => {
      // Matter check fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      await expect(getMatterInvoices('foreign-matter-uuid')).rejects.toThrow('Access denied: Matter not found');
    });
  });

  describe('getMatterPayments', () => {
    it('should retrieve payments successfully if owned by practitioner firm', async () => {
      // 1. Matter check passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'matter-123' },
        error: null
      });
      // 2. Fetch payments succeeds
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          {
            id: 'pay-123',
            invoice_id: 'inv-123',
            amount_paid: 1150,
            payment_method: 'EFT',
            transaction_reference: 'EFT-1122',
            created_at: '2026-06-02',
            invoices: {
              id: 'inv-123',
              invoice_number: 'INV-100',
              matter_id: 'matter-123'
            }
          }
        ],
        error: null
      });

      const res = await getMatterPayments('matter-123');
      expect(res.length).toBe(1);
      expect(res[0].transaction_reference).toBe('EFT-1122');
      expect(res[0].invoice_number).toBe('INV-100');
    });

    it('should reject payment retrieval if matter belongs to a different firm', async () => {
      // Matter check fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      await expect(getMatterPayments('foreign-matter-uuid')).rejects.toThrow('Access denied: Matter not found');
    });
  });
});
