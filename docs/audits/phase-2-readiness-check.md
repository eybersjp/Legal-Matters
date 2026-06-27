# Phase 2 Readiness Check

This document outlines the current readiness status of the **Legal Matters** platform prior to implementing Phase 2: Matter OS Completion and Closure Workflow Hardening.

---

## 🟢 1. What is Already Complete
* **Authentication & Tenancy Gateways**: Clerk session-based protection gates `/dashboard/*` and `/portal/*`.
* **Remote Database RLS Defense**: Deployed RLS helpers (`get_auth_user_id()`, `get_auth_firm_id()`, `get_auth_role()`) and negative cross-tenant SQL tests.
* **Write Parameter Hardening**: Checked firm ownership inside `createMatter`, `recordTimeEntry`, `addTimelineEvent`, and `createCourtDeadline` server actions.
* **Intake Schema Formats**: South African Luhn algorithm ID check (13-digit) and company registration number regex (`YYYY/NNNNNN/NN`) wired into Zod validation schemas.
* **Core Table Infrastructure**: Created `expenses` and `payments` tables with RLS and service role grants on the remote staging database.
* **Passed Diagnostics**: TypeScript checks, ESLint rules, unit tests (27/27), database RLS checks, and Playwright E2E tests (12/12) are fully green.

---

## 🟡 2. What is Partial
* **Client Intake Form**: Uses Zod validation parsing at the Server Action layer but does not display specific Zod validation sub-errors (like invalid SA ID check digit) dynamically in the UI form elements.
* **Matter Case Detail Page**: Located at `/dashboard/matters/[id]`. It is a basic outline containing only a static case summary card, a list of team members, and a timeline events log.
* **Case Closure (`closeMatter`)**: Basic action checks firm ownership and unbilled time entries, but lacks validation checks for tasks, deadlines, unpaid invoices, disbursements, closure reasons, and POPIA data-retention consent.

---

## 🔴 3. What is Missing
* **Schema Definitions**: Zod schemas for:
  - `CreateTaskSchema`
  - `CreateExpenseSchema`
  - `RecordPaymentSchema`
  - `CloseMatterValidationSchema` (closure reason, client communication status, document archive status, retention confirmation).
* **Database Fields (Migrations Required)**:
  - `matters` table: `closed_at` (TIMESTAMPTZ), `closure_reason` (TEXT), `client_communication_status` (VARCHAR), `document_archive_status` (VARCHAR), `data_retention_confirmed` (BOOLEAN).
  - `matter_deadlines` table: `is_completed` (BOOLEAN DEFAULT FALSE) to track completion status of calculated court deadlines.
* **Server Actions**:
  - **Tasks**: `getMatterTasks`, `createMatterTask`, `updateTaskStatus`, `deleteTask`.
  - **Deadlines**: `getMatterDeadlines`, `markDeadlineComplete`, `escalateOverdueDeadline`.
  - **Expenses**: `getMatterExpenses`, `recordExpense`, `deleteExpense`.
  - **Payments**: `getInvoicePayments`, `recordPayment`.
* **Matter Health Indicators**: Backend calculations for case telemetry:
  - Inactivity risk (days since last timeline event).
  - Deadline risk (days until closest open court deadline).
  - Readiness score (mandatory document uploads vs total required files).
  - Missing document count and unbilled fees / unpaid invoice alerts.
* **Unified Matter Control Center UI**: Tabbed panels in `/dashboard/matters/[id]` aggregating:
  - Task board (manage Pending, InProgress, Completed, Overdue tasks).
  - Deadline monitor (resolve calculated court day deadlines).
  - Billing & disbursements center (log expenses, list time entries/expenses, record payments against invoices).
  - Case closure wizard (guided validation checklist before archiving case).

---

## ⚡ 4. What is Risky
* **Data Migration Mismatch**: Applying ALTER TABLE migrations on matters and deadlines on the remote staging database could trigger constraint violations on existing seeded test cases if defaults are not handled carefully.
* **UI Hydration Latency**: Rendering tasks, deadlines, documents, time entries, and expenses inside a single page path `/dashboard/matters/[id]` could slow down load times if multiple un-cached server actions are fetched in parallel.
* **Cross-Tenant Leakage on New Actions**: Introducing server actions for tasks, expenses, and payments creates fresh entry points for parameter tampering. Every new action must perform explicit parent resource firm checks.

---

## 🎯 5. Recommended Implementation Priority
1. **Migration Sprint**: Alter `matters` and `matter_deadlines` tables and establish index scopes.
2. **Schema Declarations**: Write task, close matter, expense, and payment Zod definitions in schemas.
3. **Core Task/Deadline API**: Implement secure actions for task and deadline completion flows.
4. **Billing completeness API**: Write expenses and payments actions with firm-ownership verification.
5. **Matter Health & Telemetry Engine**: Write calculations for readiness scores and case alerts.
6. **UI Assembly**: Convert `/dashboard/matters/[id]` into a comprehensive Matter Control Center.

---

## 🚫 6. What Should Not Be Implemented Yet
* **Direct CaseLines API Submissions**: generated legal bundles should continue to be downloaded manually (automated API pushes remain out of scope for MVP).
* **Gemini LLM LIVE Mode RAG**: Continue using template-based mock placeholders for summaries (RAG indexing is deferred to Phase 3).
