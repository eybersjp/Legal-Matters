import { z } from 'zod';

// South African ID Verification (Luhn Algorithm compliant)
export const SaIdSchema = z
  .string()
  .length(13, 'South African ID must be exactly 13 digits')
  .regex(/^[0-9]{13}$/, 'ID must contain only digits')
  .refine((id) => {
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      let digit = parseInt(id.charAt(i), 10);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  }, 'Invalid South African ID Number (Luhn validation failed)');

// South African Company Registration Number Verification (Format: YYYY/NNNNNN/NN)
export const SaCompanyRegSchema = z
  .string()
  .regex(/^\d{4}\/\d{6}\/\d{2}$/, 'Company registration must match YYYY/NNNNNN/NN format');

// E.164 Phone Number Standard
export const PhoneE164Schema = z
  .string()
  .regex(/^\+27[1-9]\d{8}$/, 'Phone number must be E.164 standard South African format (+27...)');

// 1. Client Creation Payload Validation Schema
export const CreateClientSchema = z.object({
  type: z.enum(['Individual', 'Corporate']),
  company_name: z.string().max(255).optional(),
  registration_number: z.string().optional(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  sa_id_number: z.string().optional(),
  passport_number: z.string().max(50).optional(),
  email: z.string().email('Invalid email address format'),
  phone_number: z.string().min(10).max(20)
}).refine((data) => {
  if (data.type === 'Individual') {
    return !!data.first_name && !!data.last_name;
  } else {
    return !!data.company_name && !!data.registration_number;
  }
}, {
  message: 'Missing mandatory fields matching chosen Client type',
  path: ['type']
});

// 2. Matter Creation Validation Schema
export const CreateMatterSchema = z.object({
  client_id: z.string().uuid('Invalid client reference ID'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().optional(),
  case_number: z.string().optional(),
  court_jurisdiction: z.string().min(2, 'Jurisdiction is required').max(150),
});

// 3. Pleading Deadline Verification Schema
export const CalculateDeadlineSchema = z.object({
  trigger_date: z.string().datetime(),
  court_days_count: z.number().int().min(1),
  jurisdiction: z.string()
});

// 4. Time Entry Validation Schema
export const CreateTimeEntrySchema = z.object({
  matter_id: z.string().uuid('Invalid matter ID'),
  duration_minutes: z.number().int().min(1, 'Duration must be at least 1 minute'),
  hourly_rate_zar: z.number().min(0.00, 'Hourly rate cannot be negative'),
  description: z.string().min(5, 'Provide a clear billing description'),
});

// 5. Trust Metadata Ledger Validation Schema
export const RecordTrustSchema = z.object({
  client_id: z.string().uuid('Invalid client reference ID'),
  matter_id: z.string().uuid('Invalid matter reference ID'),
  amount: z.number().min(0.01, 'Amount must be positive'),
  section_86_type: z.enum(['86(2)', '86(3)', '86(4)']),
  description: z.string().min(5, 'Provide a transaction reference'),
});

// 6. User Auth Login Zod Validation
export const LoginValidationSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});
