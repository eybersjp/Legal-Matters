import { describe, it, expect } from 'vitest';
import { SaIdSchema, SaCompanyRegSchema, CreateClientSchema, CreateTaskSchema, CreateExpenseSchema, RecordPaymentSchema, CloseMatterValidationSchema } from '../schemas';

describe('South African ID Luhn Algorithm Validation', () => {
  it('should accept valid South African ID numbers', () => {
    // Standard valid Luhn SA ID
    const validId = '8001015009087'; 
    const res = SaIdSchema.safeParse(validId);
    expect(res.success).toBe(true);
  });

  it('should reject invalid South African ID numbers due to Luhn mismatch', () => {
    // Altered check digit
    const invalidId = '8001015009080';
    const res = SaIdSchema.safeParse(invalidId);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain('Luhn validation failed');
    }
  });

  it('should reject ID numbers with incorrect length', () => {
    const shortId = '80010150090';
    const res = SaIdSchema.safeParse(shortId);
    expect(res.success).toBe(false);
  });
});

describe('South African Company Registration Format Validation', () => {
  it('should accept valid company registration formats (YYYY/NNNNNN/NN)', () => {
    const validReg = '2026/123456/07';
    const res = SaCompanyRegSchema.safeParse(validReg);
    expect(res.success).toBe(true);
  });

  it('should reject invalid company registration formats', () => {
    const invalidReg = '2026-123456-07';
    const res = SaCompanyRegSchema.safeParse(invalidReg);
    expect(res.success).toBe(false);
  });
});

describe('FICA Client Creation Zod Schemas', () => {
  it('should validate complete Individual client details', () => {
    const client = {
      type: 'Individual' as const,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone_number: '+27821234567',
      sa_id_number: '8001015009087',
    };

    const res = CreateClientSchema.safeParse(client);
    expect(res.success).toBe(true);
  });

  it('should validate complete Corporate client details', () => {
    const client = {
      type: 'Corporate' as const,
      company_name: 'Antigravity Legal Solutions',
      registration_number: '2026/000123/07',
      email: 'legal@antigravity.co.za',
      phone_number: '+27110001234',
    };

    const res = CreateClientSchema.safeParse(client);
    expect(res.success).toBe(true);
  });

  it('should reject Individual clients missing last name', () => {
    const client = {
      type: 'Individual' as const,
      first_name: 'John',
      email: 'john.doe@example.com',
      phone_number: '+27821234567',
    };

    const res = CreateClientSchema.safeParse(client);
    expect(res.success).toBe(false);
  });

  it('should reject Corporate clients missing registration numbers', () => {
    const client = {
      type: 'Corporate' as const,
      company_name: 'Antigravity Legal Solutions',
      email: 'legal@antigravity.co.za',
      phone_number: '+27110001234',
    };

    const res = CreateClientSchema.safeParse(client);
    expect(res.success).toBe(false);
  });

  it('should reject Individual client with invalid SA ID check digit', () => {
    const client = {
      type: 'Individual' as const,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone_number: '+27821234567',
      sa_id_number: '8001015009080', // Invalid Luhn
    };

    const res = CreateClientSchema.safeParse(client);
    expect(res.success).toBe(false);
  });

  it('should reject Corporate client with invalid registration format', () => {
    const client = {
      type: 'Corporate' as const,
      company_name: 'Antigravity Legal Solutions',
      registration_number: '2026-123456-07', // Invalid format
      email: 'legal@antigravity.co.za',
      phone_number: '+27110001234',
    };

    const res = CreateClientSchema.safeParse(client);
    expect(res.success).toBe(false);
  });
});

describe('Task Creation Zod Schema', () => {
  const validTask = {
    matter_id: 'a0aa0a0a-bbbb-cccc-dddd-eeeeeeeeeeee',
    title: 'Draft Notice of Motion',
    description: 'Prepare and review notice of motion for court submission.',
    assigned_to: 'b1bb1b1b-cccc-dddd-eeee-ffffffffffff',
    due_date: '2026-06-20T17:00:00Z',
  };

  it('should validate correct task details', () => {
    const res = CreateTaskSchema.safeParse(validTask);
    expect(res.success).toBe(true);
  });

  it('should reject task with short title', () => {
    const task = { ...validTask, title: 'Do' };
    const res = CreateTaskSchema.safeParse(task);
    expect(res.success).toBe(false);
  });

  it('should reject task with invalid UUID for matter_id', () => {
    const task = { ...validTask, matter_id: 'not-a-uuid' };
    const res = CreateTaskSchema.safeParse(task);
    expect(res.success).toBe(false);
  });

  it('should reject task with invalid due date format', () => {
    const task = { ...validTask, due_date: 'invalid-date-string' };
    const res = CreateTaskSchema.safeParse(task);
    expect(res.success).toBe(false);
  });
});

describe('Expense Creation Zod Schema', () => {
  const validExpense = {
    matter_id: 'a0aa0a0a-bbbb-cccc-dddd-eeeeeeeeeeee',
    amount_zar: 1500.50,
    description: 'Sheriff service fees for summons delivery',
  };

  it('should validate correct expense details', () => {
    const res = CreateExpenseSchema.safeParse(validExpense);
    expect(res.success).toBe(true);
  });

  it('should reject negative ZAR amount', () => {
    const expense = { ...validExpense, amount_zar: -50 };
    const res = CreateExpenseSchema.safeParse(expense);
    expect(res.success).toBe(false);
  });

  it('should reject short description', () => {
    const expense = { ...validExpense, description: 'Fees' };
    const res = CreateExpenseSchema.safeParse(expense);
    expect(res.success).toBe(false);
  });
});

describe('Payment Recording Zod Schema', () => {
  const validPayment = {
    invoice_id: 'c3cc3c3c-dddd-eeee-ffff-000000000000',
    amount_paid: 23000.00,
    payment_method: 'EFT',
    transaction_reference: 'EFT-77615-INV',
  };

  it('should validate correct payment details', () => {
    const res = RecordPaymentSchema.safeParse(validPayment);
    expect(res.success).toBe(true);
  });

  it('should reject zero or negative payment amount', () => {
    const payment = { ...validPayment, amount_paid: 0 };
    const res = RecordPaymentSchema.safeParse(payment);
    expect(res.success).toBe(false);
  });

  it('should reject short transaction reference', () => {
    const payment = { ...validPayment, transaction_reference: 'tx' };
    const res = RecordPaymentSchema.safeParse(payment);
    expect(res.success).toBe(false);
  });
});

describe('Matter Case Closure Zod Schema', () => {
  const validClosure = {
    closure_reason: 'This matter has resolved successfully by settlement agreement.',
    client_communication_status: 'Notified' as const,
    document_archive_status: 'Archived' as const,
    data_retention_confirmed: true,
  };

  it('should validate correct closure compliance details', () => {
    const res = CloseMatterValidationSchema.safeParse(validClosure);
    expect(res.success).toBe(true);
  });

  it('should reject closure if reason is too short', () => {
    const closure = { ...validClosure, closure_reason: 'Settled' };
    const res = CloseMatterValidationSchema.safeParse(closure);
    expect(res.success).toBe(false);
  });

  it('should reject closure if communication status is invalid', () => {
    const closure = { ...validClosure, client_communication_status: 'Emailed' as any };
    const res = CloseMatterValidationSchema.safeParse(closure);
    expect(res.success).toBe(false);
  });

  it('should reject closure if data retention policy is not confirmed', () => {
    const closure = { ...validClosure, data_retention_confirmed: false };
    const res = CloseMatterValidationSchema.safeParse(closure);
    expect(res.success).toBe(false);
  });
});

