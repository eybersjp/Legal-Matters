# Implementation Plan: Staging Verification

This document outlines the execution plan for the staging verification phase of the **Legal Matters** platform. This plan details environment provisioning, configuration checklists, manual smoke tests, cross-tenant boundary verification, and the go/no-go decision framework for promoting the MVP to the staging environment.

---

## 🎯 1. Objective
To execute a systematic, manual and automated verification of the platform’s security, authentication, and multi-tenant isolation controls on the staging environment (`https://legal-matters-two.vercel.app`) using a dedicated staging Clerk project and clean Supabase database environment.

---

## 🚦 2. Current Known Status
- **Clerk Staging Hardening**: Completed.
- **Playwright E2E**: Fully moved to port `3333` (resolving Windows port conflicts).
- **TypeScript Typecheck**: Passed (`npm run typecheck` runs cleanly).
- **Unit Tests**: Passed (15/15 Vitest tests are green).
- **ESLint Linter**: Passed (0 warnings, 0 errors).
- **E2E Tests**: Passed (11/11 Playwright tests are green sequentially on port `3333`).
- **Production Build**: Passed (Next.js compilation compiles cleanly).
- **Server Actions Scoping**: Hardened with strict `firm_id` scoping resolved from Clerk session metadata on the server side:
  - `trust_account_records` queries and mutations.
  - `documents` and matter access.
  - `matter_deadlines` (upcoming deadlines).
  - `popia_consents` reads and writes.
  - `audit_logs` reading and writing (scoped user name lookups).
- **Staging Smoke & Isolation Tests**: Outstanding / Pending manual review.
- **Status Verdict**: **Conditionally Staging Ready — automated validation has passed, but live staging manual and cross-tenant security verification remains incomplete.**
- **Key Blocker**: Database-side Supabase Row Level Security (RLS) is not compatible with Clerk TEXT user IDs, meaning unprivileged client-side Supabase direct queries are completely blocked. All confidential legal data must remain secured behind server actions / server-side API routes.

---

## 🌐 3. Staging Environment Requirements
- **Target Staging URL**: `https://legal-matters-two.vercel.app` (or newer staging deployment URL from Vercel).
- **Clerk Instance**: A dedicated Clerk **Staging** project (do not reuse the development Clerk workspace or production keys).
- **Supabase Instance**: A dedicated staging Supabase database containing mock/test data only. No production or real client data may be imported.
- **Data Access Boundary**: Client-side direct Supabase access must not be used. All interactions must proceed via Next.js Server Actions.

---

## 🔑 4. Required Environment Variables to Verify
Confirm that the following variables are configured in the Vercel staging dashboard:

| Variable Name | Required Value/Format | Accessibility | Status |
| :--- | :--- | :--- | :--- |
| `E2E_TEST_MODE` | `false` (or unset) | Server Only (Quarantined) | **[VERIFIED]** Unset/False |
| `NEXT_PUBLIC_TEST_MODE` | `false` (or unset) | Client & Server | **[VERIFIED]** Unset/False |
| `NODE_ENV` | `production` (in Vercel staging) | Client & Server | **[VERIFIED]** Set automatically |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` (Staging Key) | Client & Server | **[VERIFIED]** Configured |
| `CLERK_SECRET_KEY` | `sk_test_...` (Staging Secret) | Server Only (Quarantined) | **[VERIFIED]** Configured |
| `NEXT_PUBLIC_SUPABASE_URL` | Staging Supabase URL | Client & Server | **[VERIFIED]** Configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging Service Role Key | Server Only (Quarantined) | **[VERIFIED]** Configured |
| `ENCRYPTION_SECRET_KEY` | Unique 32-character hex key | Server Only (Quarantined) | **[VERIFIED]** Configured |

> [!NOTE]
> - `E2E_TEST_MODE` must never be exposed as a `NEXT_PUBLIC_` variable. It must remain server-only so that browser-side code cannot enable mock authentication behaviour.
> - `NODE_ENV` is normally set by the hosting platform. On Vercel staging/preview deployments, verify runtime behaviour rather than manually overriding it unless there is a documented reason.

---

## 🛡️ 4.1. Test-Mode Safety Check
- Staging must not run mock-auth code paths.
- Mock authentication cookies must be ignored outside E2E test mode.
- The login flow must use real Clerk authentication in staging.
- Any server action used for mock login must throw or become unreachable unless `E2E_TEST_MODE` is explicitly enabled in a local Playwright environment.
- No staging or production environment may enable `E2E_TEST_MODE`.

---

## ⚙️ 5. Clerk Staging Configuration Checklist
- [ ] **Dedicated Staging Instance**: Created a new project on [dashboard.clerk.com](https://dashboard.clerk.com).
- [ ] **Allowed Origins**: Added `https://legal-matters-two.vercel.app` under **Sites** -> **Application URLs** -> **Allowed Origins**.
- [ ] **Sign-In & Sign-Up Redirects**: Configured standard redirects to `/dashboard` and `/register`.
- [ ] **MFA / Security Settings**: Enabled appropriate test accounts and passwords for staging testers.

---

## 🗄️ 6. Supabase Staging Configuration Checklist
- [ ] **Database Migrations Applied**: Executed initial schemas (`20260525000000_init_schemas.sql`, `20260525000001_enable_rls.sql`, `20260525000002_audit_triggers.sql`) and Clerk migration (`20260526000000_clerk_auth_migration.sql`).
- [x] **Column Type Verification**: Verified `firm_members.user_id` and related application user-reference fields are `TEXT` where they store Clerk user IDs. Row primary keys such as `firm_members.id` should remain unchanged unless the schema intentionally uses the Clerk user ID as the primary key.
- [ ] **Foreign Keys**: Confirmed constraints on child tables (`user_profiles`, `popia_consents`, etc.) are intact.
- [ ] **RLS Enablement**: RLS is enabled on all tables as defense-in-depth, although application queries run via the service-role client.

---

## 🚀 7. Vercel Staging Deployment Checklist
- [ ] **Git Branch Integration**: Pushed clean, typecheck-passing code to the designated staging branch.
- [x] **Environment Scope Quarantine**: Verified that server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `CLERK_SECRET_KEY`, `ENCRYPTION_SECRET_KEY`) are marked as "Server Only".
- [x] **Staging Build Passes**: Vercel deployment logs show clean Next.js bundle building without warning blocks. (Local production build confirmed clean).

---

## 📦 7.1. Required Staging Test Data
To ensure cross-tenant security tests are meaningful, both Firm A and Firm B test records must exist. Create or seed the following test data in the staging databases:
- [ ] **Firm A** record.
- [ ] **Firm B** record.
- [ ] **One Partner user** for Firm A.
- [ ] **One Attorney user** for Firm A.
- [ ] **One Client Portal user** for Firm A if the portal is enabled.
- [ ] **One Partner or Attorney user** for Firm B.
- [ ] **At least one matter** for Firm A.
- [ ] **At least one matter** for Firm B.
- [ ] **At least one document** for Firm A.
- [ ] **At least one document** for Firm B.
- [ ] **At least one POPIA consent record** for Firm A.
- [ ] **At least one POPIA consent record** for Firm B.
- [ ] **At least one audit log entry** for Firm A.
- [ ] **At least one audit log entry** for Firm B.

---

## 🧪 8. Manual Smoke Test Checklist
Perform these checks using a standard browser:
- [ ] **1. Public Pages Render**: Navigate to `/`, `/login`, and `/register`. Verify layout and stylesheet load cleanly.
- [ ] **2. Route Protection (Unauthenticated)**: Navigate directly to `/dashboard`. Verify `clerkMiddleware` redirects to `/login`.
- [ ] **3. User Registration Flow**: Complete registration at `/register`. Confirm it redirects to `/login` and creates a Clerk user on the console.
- [ ] **4. User Sign-In Flow**: Sign in at `/login`. Confirm redirect to `/dashboard`.
- [ ] **5. User Sign-Out Flow**: Click user avatar -> **Sign out**. Confirm redirection to `/login` and cookies are cleared.

---

## 🛡️ 9. Cross-Tenant Security Test Checklist
Verify application-layer isolation:
- [ ] **Cross-Tenant Matter / Client Block**: Log in as a Firm A practitioner. Try to manually browse to a Firm B matter ID (`/dashboard/matters/[firm-b-matter-id]`) or client ID (`/dashboard/clients/[firm-b-client-id]`). Verify it redirects to `/dashboard` or throws an access-denied error page.

---

## 🔏 10. POPIA Consent Protection Test
- [ ] **Consent Tamper Block**: Log in as Firm A. Trigger a POST request to the server action `updateClientPopiaConsent` with a `clientId` belonging to Firm B. Verify that the server returns `{ success: false, error: 'Access denied: Client not found.' }` and database records are untouched.

---

## 📄 11. Document Access Protection Test
- [ ] **Unauthorized Download Block**: Log in as Firm A. Trigger a POST request to `getDocumentDownloadUrl(documentId)` where the document belongs to Firm B. Verify that the server action throws an error and no URL is generated.
- [ ] **Privileged Document Block**: Log in as a Client Portal user. Verify that any documents marked `is_privileged = true` are completely excluded from lists and queries.

---

## 📜 12. Audit-Log Firm Scoping Test
- [ ] **Audit Query Isolation**: Log in as a Partner from Firm A. Navigate to settings/audit logs. Verify that only logs containing `firm_id = Firm A` are returned.
- [ ] **Profile Mapping Scope**: Verify that no practitioner names from Firm B appear in Firm A's audit log summaries.

---

## 📊 13. Dashboard Data Correctness Test
- [ ] **Dashboard Stats isolation**: Verify that stats (Billable ZAR, Matters Count, Clients Count, Trust Ledger Balance) are calculated exclusively from Firm A records.

---

## 🧪 14. E2E-versus-Real-Staging Differences

| Vector | E2E Mock Environment | Real Staging Environment |
| :--- | :--- | :--- |
| **Authentication** | Bypassed using mock cookies (`mock-authenticated = true`). | Authenticated dynamically through the Clerk API and redirect tokens. |
| **Database Connection** | Uses the in-memory/mock resolver in `server.ts`. | Connects to the real staging Supabase PostgreSQL database via HTTPS. |
| **Test Mode Code Path** | `NEXT_PUBLIC_TEST_MODE = true` triggers local mock paths. | Real actions run in standard production mode, throwing errors if session matches are missing. |

---

## 📸 15. Evidence to Capture
Maintain a secure folder of evidence showing:
1. Console screenshot of redirected unauthorized `/dashboard` access.
2. Server logs showing `Access denied` or scoping mismatch errors on cross-tenant requests.
3. Database query showing clean sync of registered Clerk TEXT IDs in `firm_members`.

---

## 🚦 16. Go/No-Go Decision Framework
- **GO Decision**: All manual smoke tests and cross-tenant checks pass. No data leaks, no crash loops.
- **NO-GO Decision**: 
  - Any cross-tenant data leak occurs (Firm A can view or edit Firm B data).
  - Clerk auth middleware fails to protect `/dashboard` or `/portal`.
  - Database queries crash due to data type or casting mismatches.

---

## ⛔ 17. Known Production Blockers
- **Supabase RLS Policy Compatibility**: Database-side RLS policies are **not compatible** with Clerk TEXT user IDs (they currently crash when `auth.uid()` is executed). A separate production security sprint must be executed to refactor RLS policies before client-side direct access is approved.

---

## 📣 18. Final Recommendation Language
- **Recommendation**: The platform is **Conditionally Staging Ready — automated validation has passed, but live staging manual and cross-tenant security verification remains incomplete.** Production readiness remains blocked until the Clerk-compatible Supabase RLS strategy is designed, implemented, and penetration-tested.
- **Required Workstream**: Database-side RLS is a separate production security sprint. Confidential legal data must remain behind server actions and server-side API routes. Direct client-side Supabase access is not approved for legal data yet. No database-level changes or policy rewrites (e.g. `get_auth_firm_id()` or `get_auth_role()`) are to be made during this staging verification phase.
