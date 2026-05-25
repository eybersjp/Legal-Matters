import { describe, it, expect } from 'vitest';
import { SaIdSchema, SaCompanyRegSchema, CreateClientSchema } from '../schemas';

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
});
