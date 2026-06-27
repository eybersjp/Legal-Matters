# Phase 2 — Matter OS Completion & Closure Workflow Hardening

This implementation plan details the architectural, database, backend API, and UI changes necessary to implement complete matter workflows, client billing controls, and LPC/POPIA compliance gates during matter closure.

## Current Baseline
* **Framework**: Next.js 15 (App Router), Supabase (PostgreSQL), Clerk.
* **Security & Tenancy**: Cross-tenant parameter checks are active in `createMatter`, `recordTimeEntry`, `addTimelineEvent`, and `createCourtDeadline` server actions. Supabase database-side RLS has passed isolation validation tests.
* **Compliance Schemas**: Zod validation schemas check 13-digit SA ID Luhn checksums and `YYYY/NNNNNN/NN` company registration patterns.
* **Database State**: `expenses` and `payments` tables exist on the remote staging database with RLS policies scoped to `get_auth_firm_id()`.
* **Diagnostic Status**: 
  - `npm run typecheck` — Passed
  - `npm run lint` — Passed (0 errors, 0 warnings)
  - `npm run test:run` — Passed (27/27 unit tests green)
  - `npm run test:db` — Passed (RLS helper functions verified)
  - `npm run test:e2e` — Passed (12/12 Playwright tests green)

---

## Sprint Objective
To transition the Matter OS from a basic layout to a fully featured practice management dashboard. This includes implementing task boards and calculated deadlines tracking, adding expenses and payments forms, updating dashboard telemetry cards, writing security regression tests, and enforcing a strict LPC-compliant case closure wizard checking for outstanding tasks, deadlines, fees, and POPIA data-retention consent.

---

## Proposed Changes

### Database & Schemas

#### [NEW] [20260612225800_phase_2_schema_adjustments.sql](file:///c:/Users/SSTECH/developments/legal-matters/app/supabase/migrations/20260612225800_phase_2_schema_adjustments.sql)
- Alter `public.matters` table: Add closure metadata columns (`closed_at`, `closure_reason`, `client_communication_status`, `document_archive_status`, `data_retention_confirmed`).
- Alter `public.matter_deadlines` table: Add `is_completed` column.
- Add database indices on `matter_tasks(matter_id, status)` and `matter_deadlines(matter_id, is_completed)`.
- Apply appropriate SELECT, INSERT, UPDATE, DELETE permissions on modified columns to database roles.

#### [MODIFY] [index.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/schemas/index.ts)
- Add Zod schemas: `CreateTaskSchema`, `CreateExpenseSchema`, `RecordPaymentSchema`, `CloseMatterValidationSchema`.

---

### Server Actions (Backend)

#### [NEW] [task.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/task.actions.ts)
- Implement `getMatterTasks(matterId: string)` (firm-scoped).
- Implement `createMatterTask(formData: any)` (firm-scoped).
- Implement `updateTaskStatus(taskId: string, status: string)` (firm-scoped).
- Implement `deleteTask(taskId: string)` (firm-scoped).

#### [MODIFY] [deadline.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/deadline.actions.ts)
- Implement `getMatterDeadlines(matterId: string)` (firm-scoped).
- Implement `markDeadlineComplete(deadlineId: string, isCompleted: boolean)` (firm-scoped).
- Implement `escalateOverdueDeadline(deadlineId: string)` (firm-scoped system-notification).

#### [MODIFY] [billing.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/billing.actions.ts)
- Implement `getMatterExpenses(matterId: string)` (firm-scoped).
- Implement `recordExpense(formData: any)` (firm-scoped).
- Implement `recordPayment(formData: any)` (firm-scoped).

#### [MODIFY] [matter.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/matter.actions.ts)
- Refactor `closeMatter(matterId: string, closureData: any)` to parse inputs via `CloseMatterValidationSchema` and verify that all billing, task, and deadline blocks are cleared before closing.

#### [MODIFY] [dashboard.actions.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/server/actions/dashboard.actions.ts)
- Include unbilled expenses, overdue tasks, and unpaid invoices in `getDashboardStats`.

---

### User Interface (Frontend)

#### [MODIFY] [page.tsx](file:///c:/Users/SSTECH/developments/legal-matters/app/src/app/dashboard/matters/[id]/page.tsx)
- Reconstruct the page into a tabbed practice center:
  - **Overview & Health Indicators**: Readiness score, inactivity warning, deadline risk badge.
  - **Timeline & Notes**: Interactive activity feed.
  - **Tasks & Deadlines**: Board to manage tasks and complete calculated deadlines.
  - **Billing Hub**: Log disbursements/expenses, record payments against invoices.
  - **Closure Wizard**: Checklist showing green/red indicators for all blocks, with form to submit closure details.

#### [MODIFY] [page.tsx](file:///c:/Users/SSTECH/developments/legal-matters/app/src/app/dashboard/page.tsx)
- Display unbilled expenses and unpaid invoices on the dashboard bento grid cards.

---

## Verification Plan

### Automated Tests
- Run `npm run test:run` to execute Vitest unit/integration tests:
  - Verify validation schemas reject invalid inputs.
  - Assert that calling task, deadline, expense, and payment actions with mismatched firm scopes returns an access error (parameter tampering defense).
  - Verify `closeMatter` gates block closure when unbilled hours/expenses or open tasks/deadlines exist.
- Run `npm run test:db` to check local and remote RLS helper compliance.
- Run `npm run test:e2e` to verify full front-to-back workflows under mock authentications.
