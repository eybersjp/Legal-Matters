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
  registration_number: z.string().optional().refine((val) => {
    if (!val) return true;
    return SaCompanyRegSchema.safeParse(val).success;
  }, 'Company registration must match YYYY/NNNNNN/NN format'),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  sa_id_number: z.string().optional().refine((val) => {
    if (!val) return true;
    return SaIdSchema.safeParse(val).success;
  }, 'Invalid South African ID Number (Luhn validation failed)'),
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

// 7. Task Creation Validation Schema
export const CreateTaskSchema = z.object({
  matter_id: z.string().uuid('Invalid matter ID'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().optional().nullable(),
  assigned_to: z.string().uuid('Invalid assigned member ID').optional().nullable().or(z.literal('')),
  due_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid due date format' }),
});

// 8. Expense Creation Validation Schema
export const CreateExpenseSchema = z.object({
  matter_id: z.string().uuid('Invalid matter ID'),
  amount_zar: z.number().min(0.00, 'Amount cannot be negative'),
  description: z.string().min(5, 'Provide a clear description of the disbursement'),
});

// 9. Payment Recording Validation Schema
export const RecordPaymentSchema = z.object({
  invoice_id: z.string().uuid('Invalid invoice ID'),
  amount_paid: z.number().positive('Payment amount must be greater than zero'),
  payment_method: z.string().min(2, 'Payment method is required'),
  transaction_reference: z.string().min(3, 'Provide a valid transaction reference'),
});

// 10. Matter Case Closure Validation Schema
export const CloseMatterValidationSchema = z.object({
  closure_reason: z.string().min(10, 'Provide a detailed closure reason (minimum 10 characters)'),
  closure_notes: z.string().optional().nullable(),
  client_communication_status: z.enum(['Notified', 'Acknowledged', 'Waived']),
  document_archive_status: z.enum(['Archived', 'Quarantined']),
  data_retention_confirmed: z.boolean().refine((val) => val === true, 'You must confirm that the POPIA data-retention policy is acknowledged'),
});

// 11. AI Output Citation Schema
export const CreateAiOutputSourceSchema = z.object({
  source_type: z.enum(['document', 'extraction', 'matter_field', 'note', 'task', 'deadline', 'billing', 'timeline']),
  source_ref_id: z.string().uuid().optional().nullable(),
  document_id: z.string().uuid().optional().nullable(),
  document_version_id: z.string().uuid().optional().nullable(),
  page_number: z.number().int().positive().optional().nullable(),
  quote: z.string().optional().nullable(),
  source_label: z.string().optional().nullable(),
  confidence: z.enum(['high', 'medium', 'low']).optional().nullable(),
});

// 12. Create AI Output Schema
export const CreateAiOutputSchema = z.object({
  matter_id: z.string().uuid().optional().nullable(),
  document_id: z.string().uuid().optional().nullable(),
  output_type: z.string().min(1, 'Output type is required'),
  title: z.string().min(1, 'Title is required'),
  content: z.record(z.any()),
  confidence: z.enum(['high', 'medium', 'low']),
  missing_information: z.array(z.string()).default([]),
  suggested_next_actions: z.array(z.string()).default([]),
  status: z.enum(['draft', 'reviewed', 'approved', 'rejected', 'superseded']).default('draft'),
  citations: z.array(CreateAiOutputSourceSchema).default([]),
});

// 13. AI Output Review Schema
export const ReviewAiOutputSchema = z.object({
  reason: z.string().optional().nullable(),
});

// 14. AI Output Approval Schema
export const ApproveAiOutputSchema = z.object({
  reason: z.string().optional().nullable(),
});

// 15. AI Output Rejection Schema
export const RejectAiOutputSchema = z.object({
  reason: z.string().min(5, 'Rejection reason must be at least 5 characters'),
});

// 16. Run Matter Readiness Check Input Schema
export const RunMatterReadinessCheckSchema = z.object({
  matter_id: z.string().uuid('Invalid matter ID — must be a valid UUID'),
  readiness_type: z.enum([
    'full',
    'documents',
    'tasks',
    'deadlines',
    'billing',
    'ai_outputs',
    'closure'
  ]).default('full'),
});

// 17. Matter Readiness Item Schema (individual criterion result)
export const MatterReadinessItemSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  label: z.string().min(1, 'Label is required'),
  status: z.enum(['passed', 'missing', 'warning', 'blocked']),
  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),
  source_type: z.enum([
    'task', 'deadline', 'document', 'extraction',
    'ai_output', 'invoice', 'expense', 'matter_field'
  ]).optional().nullable(),
  source_ref_id: z.string().uuid().optional().nullable(),
  recommendation: z.string().optional().nullable(),
});

// 18. Matter Readiness Check Result Schema (full check output)
export const MatterReadinessCheckResultSchema = z.object({
  check_id: z.string().uuid(),
  matter_id: z.string().uuid(),
  firm_id: z.string().uuid(),
  readiness_type: z.string(),
  score: z.number().int().min(0).max(100),
  status: z.enum(['not_ready', 'needs_review', 'ready']),
  advisory_note: z.string(),
  items: z.array(MatterReadinessItemSchema),
  checked_at: z.string().datetime(),
});
