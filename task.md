# Developer Task Checklist: Security Hardening & MVP Completeness

This document contains the actionable, step-by-step task list to complete the implementation of the **Legal Matters** practice management platform.

---

## Task 1: Fix Cross-Firm Client/Matter Linkage in `createMatter` Server Action

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Prevent cross-tenant parameter tampering by validating that the user's `firm_id` owns the `client_id` referenced in the request before creating a new matter.

Files to inspect:  
- [app/src/server/actions/matter.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/matter.actions.ts)
- [app/src/lib/auth.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/lib/auth.ts)

Files to change:  
- [app/src/server/actions/matter.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/matter.actions.ts)

Database changes:  
None.

Implementation steps:  
1. Retrieve the authenticated user's `firm_id` using `requireAuthUser()`.
2. Retrieve the client record from the database matching the client ID and the practitioner's firm ID:
   ```typescript
   const { data: client, error } = await supabase
     .from('clients')
     .select('id')
     .eq('id', clientId)
     .eq('firm_id', auth.firmId)
     .single();
   ```
3. If no client record is returned (or an error occurs), immediately throw a forbidden error: `new Error("Access denied: Client does not belong to your practice.")`.
4. Proceed with matter insertion using `createAdminClient()`.

Acceptance criteria:  
- A practitioner from Firm A attempting to create a matter linked to a Client belonging to Firm B is blocked and receives a clean validation exception.
- Matters can only be successfully linked to clients within the practitioner's authenticated firm context.

Tests to run:  
- `npm run typecheck`
- `npm run test:run`

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 2: Fix Cross-Firm Matter Linkage in `recordTimeEntry` Server Action

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Prevent practitioners from recording billable time entries against matters belonging to another law practice.

Files to inspect:  
- [app/src/server/actions/time.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/time.actions.ts)

Files to change:  
- [app/src/server/actions/time.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/time.actions.ts)

Database changes:  
None.

Implementation steps:  
1. Call `requireAuthUser()` to obtain the user's `firm_id`.
2. Query the `matters` table to verify ownership:
   ```typescript
   const { data: matter } = await supabase
     .from('matters')
     .select('id')
     .eq('id', matterId)
     .eq('firm_id', auth.firmId)
     .single();
   ```
3. If the matter is not found or belongs to another firm, reject the mutation: `throw new Error("Access denied: Matter not found.")`.
4. Proceed to insert the time entry.

Acceptance criteria:  
- Recording a time entry against a foreign `matter_id` returns an access denied error.
- Time entries are recorded successfully for valid matters owned by the authenticated firm.

Tests to run:  
- `npm run test:run`

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 3: Fix Cross-Firm Linkage in Timeline and Deadline Server Actions

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Harden `addTimelineEvent` and `createCourtDeadline` server actions by checking that the referenced matter belongs to the practitioner's firm.

Files to inspect:  
- [app/src/server/actions/timeline.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/timeline.actions.ts)
- [app/src/server/actions/deadline.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/deadline.actions.ts)

Files to change:  
- [app/src/server/actions/timeline.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/timeline.actions.ts)
- [app/src/server/actions/deadline.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/deadline.actions.ts)

Database changes:  
None.

Implementation steps:  
1. Call `requireAuthUser()` to obtain the user's `firm_id`.
2. Inside `addTimelineEvent`, check if the matter is owned by the firm before inserting the event.
3. Inside `createCourtDeadline`, check if the matter is owned by the firm before inserting the calculated deadline.
4. Throw a scoping exception if firm validation fails.

Acceptance criteria:  
- Foreign matter event insertions are blocked.
- Foreign deadline calculations are blocked.

Tests to run:  
- `npm run test:run`

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 4: Enforce South African ID & Company Registration validation on Client Intake

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Wire the South African Luhn algorithm ID verification and company registration string check into the main intake validation schema and parse it.

Files to inspect:  
- [app/src/schemas/index.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/schemas/index.ts)
- [app/src/server/actions/client.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/client.actions.ts)

Files to change:  
- [app/src/schemas/index.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/schemas/index.ts)
- [app/src/server/actions/client.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/client.actions.ts)

Database changes:  
None.

Implementation steps:  
1. Refactor `CreateClientSchema` in `schemas/index.ts` to integrate `SaIdSchema` and `SaCompanyRegSchema`:
   ```typescript
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
       if (data.sa_id_number) {
         return SaIdSchema.safeParse(data.sa_id_number).success;
       }
       return !!data.first_name && !!data.last_name;
     } else {
       if (data.registration_number) {
         return SaCompanyRegSchema.safeParse(data.registration_number).success;
       }
       return !!data.company_name && !!data.registration_number;
     }
   }, {
     message: 'Invalid South African ID format or missing mandatory fields matching Client type',
     path: ['type']
   });
   ```
2. Refactor `addClient` action to parse the client object through `CreateClientSchema.parse(payload)` before executing the insert.

Acceptance criteria:  
- Registering an individual client with a malformed SA ID (e.g. `8001015009080` check digit fail) is rejected.
- Registering a corporate client with a malformed company registration number (e.g. `2026-123456-07` instead of `2026/123456/07`) is rejected.

Tests to run:  
- `npm run test:run`

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 5: Implement Matter Close Workflow checking for Unbilled Entries

Status: COMPLETED  
Priority: P2_IMPORTANT  

Goal:  
Implement the Case Closure workflow that checks for outstanding unbilled items and shifts the matter status to `Closed`.

Files to inspect:  
- [app/src/server/actions/matter.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/matter.actions.ts)

Files to change:  
- [app/src/server/actions/matter.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/matter.actions.ts)

Database changes:  
None.

Implementation steps:  
1. Add `closeMatter(matterId: string)` server action.
2. Inside `closeMatter`, verify the user's firm owns the matter.
3. Check the `time_entries` table for the matter where `is_billed = false`. If records exist, return `{ success: false, error: 'Cannot close matter: Unbilled time entries exist.' }`.
4. Update matter `status` to `'Closed'`.
5. Insert a matter event into the timeline tracking the closure.

Acceptance criteria:  
- Matters with unbilled hours cannot be closed.
- Matter status changes to `Closed` on clean case records.

Tests to run:  
- `npm run test:run`

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 6: Add Expenses and Payments Tables for Billing Completeness

Status: COMPLETED  
Priority: P2_IMPORTANT  

Goal:  
Create database tables for expenses and payment records to allow logging disbursements and recording invoices as Paid.

Files to inspect:  
- [app/supabase/migrations/](file:///c:/Users/SSTECH/developments/legal-matters/app/supabase/migrations/)

Files to change:  
- [app/supabase/migrations/[NEW]_add_expenses_payments.sql](file:///c:/Users/SSTECH/developments/legal-matters/app/supabase/migrations/)

Database changes:  
Create `expenses` and `payments` tables with RLS and firm scoping.

Implementation steps:  
1. Write the SQL script declaring the `expenses` and `payments` tables.
2. Configure RLS rules on both tables scoping actions by `get_auth_firm_id()`.
3. Apply migration to the local database.

Acceptance criteria:  
- Running database migrations completes cleanly.
- Tables exist with row level security active.

Tests to run:  
- `npm run test:db`

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 7: Verify Previous Sprint Baseline

Status: COMPLETED  
Priority: P0_BLOCKER  

Goal:  
Verify that the reported Tasks 1-6 changes exist and that all test commands still pass.

Files to inspect:  
- [app/src/server/actions/matter.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/matter.actions.ts)
- [app/src/server/actions/time.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/time.actions.ts)
- [app/src/server/actions/timeline.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/timeline.actions.ts)
- [app/src/server/actions/deadline.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/deadline.actions.ts)
- [app/src/schemas/index.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/schemas/index.ts)
- [app/src/tests/validation.test.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/tests/validation.test.ts)
- [app/src/tests/matter.test.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/tests/matter.test.ts)
- [app/supabase/migrations/20260612224515_add_expenses_payments.sql](file:///c:/Users/SSTECH/developments/legal-matters/app/supabase/migrations/20260612224515_add_expenses_payments.sql)
- [task.md](file:///c:/Users/SSTECH/developments/legal-matters/task.md)
- [ai-loop/memory.md](file:///c:/Users/SSTECH/developments/legal-matters/ai-loop/memory.md)

Implementation steps:  
1. Inspect all listed files.  
2. Confirm the reported changes exist.  
3. Run verification commands.  
4. Record results.  

Acceptance criteria:  
- All reported files exist.  
- All reported functions exist.  
- All relevant tests pass.  
- Any mismatch is documented before new implementation starts.  

Tests to run:  
- npm run typecheck  
- npm run lint  
- npm run test:run  
- npm run test:db  
- npm run test:e2e  

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 8: Database Migrations for Phase 2 Schema Adjustments

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Alters public.matters and public.matter_deadlines to add columns necessary for tracking calculated deadline completions and case closure compliance.

Files to inspect:  
- [app/supabase/migrations/20260525000000_init_schemas.sql](file:///c:/Users/SSTECH/developments/legal-matters/app/supabase/migrations/20260525000000_init_schemas.sql)

Files to change:  
- [app/supabase/migrations/20260612225800_phase_2_schema_adjustments.sql](file:///c:/Users/SSTECH/developments/legal-matters/app/supabase/migrations/20260612225800_phase_2_schema_adjustments.sql) [NEW]

Database changes:  
- Alter `public.matters` table: add `closed_at` (TIMESTAMPTZ), `closure_reason` (TEXT), `client_communication_status` (VARCHAR(100)), `document_archive_status` (VARCHAR(100)), `data_retention_confirmed` (BOOLEAN DEFAULT FALSE NOT NULL).  
- Alter `public.matter_deadlines` table: add `is_completed` (BOOLEAN DEFAULT FALSE NOT NULL).  
- Create database indices on `matter_tasks(matter_id, status)` and `matter_deadlines(matter_id, is_completed)`.  
- Grant all permissions on altered columns/tables to default roles (`postgres`, `service_role`, `authenticated`, `anon`).

Implementation steps:  
1. Create SQL migration file `20260612225800_phase_2_schema_adjustments.sql`. [DONE]  
2. Write ALTER TABLE statements and check constraints. [DONE]  
3. Run `npx supabase db push` to push modifications to the staging database. [DONE]  

Acceptance criteria:  
- Migration runs successfully on remote staging database.  
- Database schema matches the updated columns.  

Tests to run:  
- npm run test:db  

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 9: Add Zod Validation Schemas for Tasks, Expenses, Payments, and Matter Closure

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Declare Zod schemas in `schemas/index.ts` to validate client data on tasks, billing, and matter closure.

Files to inspect:  
- [app/src/schemas/index.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/schemas/index.ts)

Files to change:  
- [app/src/schemas/index.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/schemas/index.ts)

Database changes:  
None.

Implementation steps:  
1. Define `CreateTaskSchema` validating `matter_id`, `title`, `description`, `assigned_to`, and `due_date`. [DONE]  
2. Define `CreateExpenseSchema` validating `matter_id`, `amount_zar` (non-negative), and `description`. [DONE]  
3. Define `RecordPaymentSchema` validating `invoice_id`, `amount_paid` (positive), `payment_method`, and `transaction_reference`. [DONE]  
4. Define `CloseMatterValidationSchema` validating `closure_reason`, `client_communication_status`, `document_archive_status`, and `data_retention_confirmed`. [DONE]  

Acceptance criteria:  
- Schemas reject missing or malformed inputs and pass clean payloads.  

Tests to run:  
- npm run test:run  

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

### Task 10: Implement Server Actions for Matter Tasks

Status: COMPLETED  
Priority: P2_IMPORTANT  

Goal:  
Implement secure backend actions for creating, fetching, updating, and deleting tasks under the practitioner's firm.

Files to change:  
- [app/src/server/actions/task.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/task.actions.ts) [NEW]

Database changes:  
None.

Implementation steps:  
1. Create `task.actions.ts`. [DONE]  
2. Implement `getMatterTasks(matterId: string)`: verify firm ownership of matter, then select tasks. [DONE]  
3. Implement `createMatterTask(formData: any)`: parse with `CreateTaskSchema`, verify matter ownership, insert task. [DONE]  
4. Implement `updateTaskStatus(taskId: string, status: string)`: verify task ownership, update status, write audit log. [DONE]  
5. Implement `deleteTask(taskId: string)`: verify task ownership, delete task. [DONE]  

Acceptance criteria:  
- Task actions reject cross-tenant inputs with error responses.  
- Tasks can be successfully managed.  

Tests to run:  
- npm run test:run  

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 11: Implement Server Actions for Deadlines and Escalations

Status: COMPLETED  
Priority: P2_IMPORTANT  

Goal:  
Add actions to list matter deadlines, mark them completed, and escalate overdue deadlines.

Files to inspect:  
- [app/src/server/actions/deadline.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/deadline.actions.ts)

Files to change:  
- [app/src/server/actions/deadline.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/deadline.actions.ts)

Database changes:  
None.

Implementation steps:  
1. Implement `getMatterDeadlines(matterId: string)`: check firm ownership, return deadlines. [DONE]  
2. Implement `markDeadlineComplete(deadlineId: string, isCompleted: boolean)`: check firm ownership, update `is_completed` column. [DONE]  
3. Implement `escalateOverdueDeadline(deadlineId: string)`: trigger system alerts/notifications if a deadline passes without completion. [DONE]  

Acceptance criteria:  
- Calculated deadlines can be checked off.  

Tests to run:  
- npm run test:run  

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 12: Implement Server Actions for Expenses and Payments

Status: COMPLETED  
Priority: P2_IMPORTANT  

Goal:  
Create server actions for expenses (disbursements) and invoice payment logs.

Files to inspect:  
- [app/src/server/actions/billing.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/billing.actions.ts)

Files to change:  
- [app/src/server/actions/billing.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/billing.actions.ts)

Database changes:  
None.

Implementation steps:  
1. Implement `getMatterExpenses(matterId: string)`: return expenses for matter. [DONE]  
2. Implement `recordExpense(formData: any)`: parse with `CreateExpenseSchema`, verify matter ownership, insert expense, log audit. [DONE]  
3. Implement `recordPayment(formData: any)`: parse with `RecordPaymentSchema`, verify invoice ownership, insert payment, check total paid vs total due, update invoice status to `Paid` if satisfied. [DONE]  

Acceptance criteria:  
- Expenses are recorded against matters.  
- Payment records log EFT details and trigger automatic invoice settlement updates.  

Tests to run:  
- npm run test:run  

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 13: Harden `closeMatter` Server Action Closure Checklist

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Refactor `closeMatter` to check all LPC and POPIA compliance validations.

Files to inspect:  
- [app/src/server/actions/matter.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/matter.actions.ts)

Files to change:  
- [app/src/server/actions/matter.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/matter.actions.ts)

Database changes:  
None.

Implementation steps:  
1. In `closeMatter`, parse `closureData` through `CloseMatterValidationSchema`.  
2. Query `time_entries` and `expenses` to verify no unbilled items exist (`is_billed = false`).  
3. Query `invoices` to verify no open/overdue invoices exist.  
4. Query `matter_tasks` and `matter_deadlines` to verify all are completed.  
5. Check data retention consent boolean is checked.  
6. Transition status to `'Closed'` and save closure details.  

Acceptance criteria:  
- Case closure fails if any task, deadline, expense, or invoice is left unresolved.  

Tests to run:  
- npm run test:run  

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 14: Add Unified Tabbed Matter Control Center UI

Status: COMPLETED  
Priority: P2_IMPORTANT  

Goal:  
Build the UI tabs inside `/dashboard/matters/[id]` to manage tasks, deadlines, expenses, payments, and case closure.

Files to inspect:  
- [app/src/app/dashboard/matters/[id]/page.tsx](file:///c:/Users/SSTECH/developments/legal-matters/app/src/app/dashboard/matters/%5Bid%5D/page.tsx)

Files to change:  
- [app/src/app/dashboard/matters/[id]/page.tsx](file:///c:/Users/SSTECH/developments/legal-matters/app/src/app/dashboard/matters/%5Bid%5D/page.tsx)

Database changes:  
None.

Implementation steps:  
1. Create tab selectors: Overview, Timeline, Tasks, Billing, Closure.  
2. Render task board with modals to create and toggle task status.  
3. Render deadline tracker with completion checkboxes.  
4. Render billing panel displaying time entries, disbursements, and form to record EFT payments.  
5. Build guided closure checklist showing validation indicators (red/green) and "Close Case" form.  

Acceptance criteria:  
- Tab views hydrate and render properly.  
- Guided checklist dynamically displays blocking errors.  

Tests to run:  
- npm run test:e2e  

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 15: Create Security Regression Tests

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Write unit tests ensuring that task, deadline, expense, and payment actions reject cross-tenant inputs.

Files to inspect:  
- [app/src/tests/matter.test.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/tests/matter.test.ts)

Files to change:  
- [app/src/tests/security-regression.test.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/tests/security-regression.test.ts) [NEW]

Database changes:  
None.

Implementation steps:  
1. Create `security-regression.test.ts` testing security boundaries.  
2. Call `recordExpense`, `recordPayment`, `createMatterTask` with mismatched `firm_id` context and assert they fail.  
3. Call `closeMatter` without required compliance states and assert it fails.  

Acceptance criteria:  
- All regression tests pass and prevent cross-firm data exposure.  

Tests to run:  
- npm run test:run  

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 16: Staging Deployment Readiness & Smoke Test Gate

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Verify that the Legal Matters MVP foundation is safe, deployable, and functional in staging before adding any new feature modules.

Files to inspect:  
- [docs/STAGING_READINESS_REPORT.md](file:///c:/Users/SSTECH/developments/legal-matters/docs/STAGING_READINESS_REPORT.md)

Files to change:  
None.

Database changes:  
None.

Implementation steps:  
1. Run staging database verification checks and RLS helper tests.  
2. Confirm no environment variable leaks exist.  
3. Validate client bundle builds and production builds successfully.  
4. Verify the dashboard, control center, and closure checklists render without error.  

Acceptance criteria:  
- Staging readiness report is written.  
- Build compiles and tests succeed.  

Tests to run:  
- npm run build  
- npm run test:db  
- npm run test:run  

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 17: Update Documentation and Memory

Status: COMPLETED  
Priority: P3_IMPROVEMENT  

Goal:  
Record Phase 2 sprint results and update documentation logs.

Files to change:  
- [ai-loop/memory.md](file:///c:/Users/SSTECH/developments/legal-matters/ai-loop/memory.md)
- [task.md](file:///c:/Users/SSTECH/developments/legal-matters/task.md)

Implementation steps:  
1. Log the completion of Phase 2 items.  
2. Mark all checklist items checked.  

Acceptance criteria:  
- memory.md is successfully updated.

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 18: Production Blocker Cleanup & Staging URL Verification

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Remove the unsafe client-exposed `NEXT_PUBLIC_TEST_MODE` pattern, replace it with server-only `E2E_TEST_MODE`, verify local/staging smoke-test configuration, and update all documentation honestly.

Files to inspect:  
- [app/src/app/login/page.tsx](file:///c:/Users/SSTECH/developments/legal-matters/app/src/app/login/page.tsx)
- [app/src/lib/auth.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/lib/auth.ts)
- [app/src/lib/supabase/middleware.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/lib/supabase/middleware.ts)
- [app/src/lib/supabase/server.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/lib/supabase/server.ts)
- [app/src/middleware.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/middleware.ts)
- [app/playwright/playwright.config.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/playwright/playwright.config.ts)

Files to change:  
- [app/src/app/login/page.tsx](file:///c:/Users/SSTECH/developments/legal-matters/app/src/app/login/page.tsx)
- [app/src/lib/auth.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/lib/auth.ts)
- [app/src/lib/supabase/middleware.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/lib/supabase/middleware.ts)
- [app/src/lib/supabase/server.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/lib/supabase/server.ts)
- [app/src/middleware.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/middleware.ts)
- [app/playwright/playwright.config.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/playwright/playwright.config.ts)
- [app/.env.example](file:///c:/Users/SSTECH/developments/legal-matters/app/.env.example)

Database changes:  
None.

Implementation steps:  
1. Replace `NEXT_PUBLIC_TEST_MODE` with `E2E_TEST_MODE` across code, config, and env examples.  
2. Harded mock auth login logic by implementing `tryTestLogin` server-only action checking environment bounds.  
3. Update Playwright config to support `E2E_BASE_URL` override.  
4. Verify Vercel deployment URL status and configuration.  
5. Run verification suite (`npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run test:db`, `npm run build`, `npm run test:e2e`).  
6. Document changes in `STAGING_READINESS_REPORT.md` and `walkthrough.md`.  

Acceptance criteria:  
- No `NEXT_PUBLIC_TEST_MODE` remains.  
- Staging readiness report is updated honestly.  

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 19: Staging Deployment Activation & Smoke Test Verification

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Resolve the remaining production blocker by configuring, locating, or confirming the Vercel staging deployment URL, verifying required environment variables, running deployed smoke tests against the remote staging URL, and updating the staging readiness documentation.

Files to inspect:  
- [docs/STAGING_READINESS_REPORT.md](file:///c:/Users/SSTECH/developments/legal-matters/docs/STAGING_READINESS_REPORT.md)
- [task.md](file:///c:/Users/SSTECH/developments/legal-matters/task.md)
- [ai-loop/memory.md](file:///c:/Users/SSTECH/developments/legal-matters/ai-loop/memory.md)

Database changes:  
None.

Implementation steps:  
1. Locate and verify the live Vercel staging URL.  
2. Verify that staging environment variables are correctly configured on Vercel.  
3. Run remote E2E smoke tests using `E2E_BASE_URL` pointing to the staging URL.  
4. Update `STAGING_READINESS_REPORT.md` and `walkthrough.md` with verified staging URL and test results.  
5. Document the results and mark Task 19 completed.  

Acceptance criteria:  
- Deployed staging URL is verified.  
- Staging environment variables are verified.  
- Playwright tests are executed against the remote staging URL and results recorded.  

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 20: Real Authenticated Staging Smoke Test Setup

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Create a secure, real-auth staging smoke test path that verifies authenticated Legal Matters workspace functionality on the deployed Vercel staging URL without using mock authentication, client-exposed test flags, or production auth bypasses.

Files to inspect:  
- [app/playwright/tests/app.spec.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/playwright/tests/app.spec.ts)
- [app/scripts/seed-staging.js](file:///c:/Users/SSTECH/developments/legal-matters/app/scripts/seed-staging.js)
- [docs/STAGING_READINESS_REPORT.md](file:///c:/Users/SSTECH/developments/legal-matters/docs/STAGING_READINESS_REPORT.md)

Database changes:  
None.

Implementation steps:  
1. Create `seed-staging.js` script to resolve Clerk User IDs via Backend API and seed a complete, mock-compatible workspace dataset.  
2. Update Playwright config and `app.spec.ts` E2E tests to support dynamic form-based real login when E2E_CLERK_EMAIL is set.  
3. Perform typecheck, lint, unit tests, DB tests, and build compilation locally.  
4. Document the remote authenticated testing process in `STAGING_READINESS_REPORT.md` and `walkthrough.md`.  

Acceptance criteria:  
- Staging test user seeding script exists.  
- E2E tests login dynamically using credentials on remote staging.  
- Seeding data is mock-compatible.  

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 21: Resolve Clerk Test User Authentication Blocker & Complete Remote E2E

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Rotate exposed Clerk secrets, recreate the staging Clerk E2E test user with a fresh password, run the remote seeding script, and execute Playwright tests successfully against the staging URL.

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 22: Phase 2 Release Candidate Lock & Demo Readiness

Status: COMPLETED  
Priority: P1_MVP_CRITICAL  

Goal:  
Lock Phase 2 as a stable release candidate and prepare the platform for demo, stakeholder review, and Phase 3 planning.

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Task 23: Phase 3 Planning — Document Intelligence & AI Matter Readiness

Status: COMPLETED  
Priority: P3_IMPROVEMENT  

Goal:  
Create the implementation plan for Phase 3, focused on live Document Intelligence, AI Matter Readiness, source-cited AI outputs, and readiness scoring.

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

---

## Phase 3 — Document Intelligence & AI Matter Readiness

### Task 24: Storage and Document Processing Schema
Status: COMPLETED  
Priority: P1_MVP_CRITICAL  
Goal: Create migration scripts for `document_processing_jobs`, `document_extractions`, `ai_outputs`, `ai_output_sources`, `matter_readiness_checks`, `matter_readiness_items`, and `ai_approval_events` with RLS.

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented  

### Task 25: Supabase Storage Upload Integration
Status: COMPLETED  
Priority: P1_MVP_CRITICAL  
Goal: Integrate client-side file upload directly to Supabase storage buckets partitioned by `firm_id/matter_id/`.

Done:
- [x] Completed  
- [x] Tested  
- [x] Documented  


### Task 26: Document Extraction Pipeline
Status: COMPLETED  
Priority: P1_MVP_CRITICAL  
Goal: Create the server action to process text extraction jobs, adding exclusions flags check.

Done:
- [x] Completed  
- [x] Tested  
- [x] Documented### Task 27: AI Output Schema and Audit Logs
Status: COMPLETED  
Priority: P1_MVP_CRITICAL  
Goal:  
Implement Zod validation schemas for AI outputs, quote citations, and create server actions to insert AI outputs and log audits.

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented### Task 28: Document Summary UI
Status: COMPLETED  
Priority: P2_IMPORTANT  
Goal:  
Build the frontend visual interfaces for the Document Summary and AI citation panels.

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented### Task 29: Matter Readiness Engine
Status: COMPLETED  
Priority: P2_IMPORTANT  
Goal:  
Implement the server action to run readiness evaluations and compile scores based on category weightings.

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented### Task 30: AI Approval Workflow
Status: COMPLETED  
Priority: P1_MVP_CRITICAL  
Goal:  
Create the server actions to approve/reject AI summaries, validating that approved states cannot be overridden or edited.

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented### Task 31: Phase 3 E2E and Staging Verification
Status: COMPLETED  
Priority: P1_MVP_CRITICAL  
Goal:  
Write Playwright E2E tests validating the document extraction status, citation panel, warning banners, vector scopes, and AI approval flow.

Done:  
- [x] Completed  
- [x] Tested  
- [x] Documented
