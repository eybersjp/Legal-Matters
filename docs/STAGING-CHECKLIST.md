# Staging Deployment Readiness Checklist

This checklist tracks the deployment validation requirements for the **Legal Matters** platform prior to pushing the MVP v1 to the staging environment.

---

## 🔒 1. Row Level Security (RLS) & Multi-Tenant Isolation

> **Note:** The app uses `createAdminClient()` (service role key) for all server actions, which bypasses RLS. Multi-tenant isolation is enforced at the **application layer** via explicit `firm_id` filters on every query. The RLS policies below serve as **defense-in-depth** in case a direct database connection is used.

- [x] **Migration Applied**: Confirm that the Clerk auth migration (`20260526000000_clerk_auth_migration.sql`) has been executed on staging. This changes `firm_members.id` from `UUID` to `TEXT` to store Clerk user IDs (e.g. `user_2abc123`).
- [x] **RLS Enabled**: Confirm that `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is applied on all 22 core tables.
- [x] **Clerk-Compatible Policies**: Verify that all RLS policies and database helper functions (`get_auth_user_id()`, `get_auth_firm_id()`, and `get_auth_role()`) are redesigned, applied via `20260608000000_clerk_rls_redesign.sql`, and verified database-side using `npm run test:db`. Direct client-side queries are still blocked; all database queries must proceed via Server Actions until client-side JWT injection is fully implemented and tested.
- [x] **Application-Level Firm Scoping**: Confirm that every server action query includes an explicit `.eq('firm_id', ...)` filter — see `app/src/server/actions/*.ts` for the `firm_id` pattern across all documents, parties, deadlines, time entries, audit logs, timelines, and billing queries.
- [x] **Cross-Firm Isolation Test**: Attempt to fetch matter rows belonging to Firm B using a Firm A Clerk session. Ensure that zero rows are returned (application-layer check verified in Vitest unit tests and Playwright E2E suites).
- [x] **Cross-Tenant RLS Negative Tests**: Verify multi-tenant RLS isolation under the real `authenticated` role using transaction-isolated checks in `clerk_rls_tenant_isolation.sql` and automated migration gate `20260608000001_run_rls_isolation_tests.sql` (completed 2026-06-08).
- [ ] **Drop RLS Test Helpers**: Drop staging test helpers before production deployment using `docs/sql/production-drop-rls-test-helpers.sql` (deferred to production hardening sprint).
- [ ] **Privilege Quarantine Policies**: Verify that users with the role `External Counsel` or `Client` are strictly blocked from seeing document records where `is_privileged = true` (application-layer checks are implemented, but need additional end-to-end verification).

---

## 🔑 2. Clerk Authentication & Session Management
- [ ] **Clerk Dashboard Configured**: Confirm the Clerk application exists at [dashboard.clerk.com](https://dashboard.clerk.com) with the staging deployment URL added under **Sites**.
- [x] **Environment Variables Set**: Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are configured in the Vercel staging environment. (Confirmed via Vercel CLI on 2026-06-06).
- [x] **Middleware Protection**: Verify that `clerkMiddleware` in `app/src/middleware.ts` calls `auth.protect()` for `/dashboard/*` and `/portal/*` routes, redirecting unauthenticated users to `/login`.
- [ ] **Session Persistence**: Confirm that Clerk session tokens persist across page refreshes and browser restarts (Clerk handles session cookies automatically).
- [ ] **User Sign-Out**: Verify that clicking the `UserButton` → **Sign out** clears the session and redirects to `/login`.

---

## 📜 3. South African POPIA & Regulatory Compliance
- [ ] **Luhn SA ID Checks**: Verify that client onboarding flows reject non-compliant South African 13-digit identity numbers.
- [ ] **LPC Registration Verification**: Ensure that the signing up firm provides a valid Law Society of South Africa / Legal Practice Council practice number.
- [ ] **POPIA Consent Flags**: Check that individual/corporate client additions capture granular processing consent and communication channel flags.
- [ ] **Immutable Audit Logging**: Confirm that all read accesses to sensitive personal data (e.g. client profile viewing) successfully write structured records to the `audit_logs` table.
- [ ] **Section 86 Trust Protection**: Verify that the trust metadata layer prevents mixing client trust balances with the firm's operational accounts.

---

## ⚙️ 4. Environment Variable Safety & Test Mode Guards
- [x] **Production Guards**: Verify that the `NEXT_PUBLIC_TEST_MODE` E2E mock bypass has an active guard checking `process.env.NODE_ENV !== 'production'`.
- [x] **Symmetric Encryption Keys**: Ensure that the `ENCRYPTION_SECRET_KEY` is a unique, hex-encoded 32-character key generated via secure random sources (not reusing example keys).
- [x] **Supabase Key Quarantine**: Confirm that `SUPABASE_SERVICE_ROLE_KEY` is only available on the server-side environment and is never exposed in client bundles.
- [x] **Clerk Secret Key Quarantine**: Confirm that `CLERK_SECRET_KEY` is a server-side only variable and is never exposed in client bundles (it is NOT prefixed with `NEXT_PUBLIC_`).
- [x] **Clerk Publishable Key**: Confirm that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set and accessible on the client side (it IS prefixed with `NEXT_PUBLIC_` and is safe to expose).

---

## 🚀 5. Build, Lint, & CI Pipeline
- [x] **Compile Success**: Run `npm run typecheck` and verify there are zero TypeScript compiler warnings.
- [x] **Code Linting Check**: Run `npm run lint` and verify full compliance.
- [x] **Unit Tests Passed**: Run `npm run test:run` and verify all 15 Vitest tests are green.
- [ ] **CI Pipeline Checked**: Confirm `.github/workflows/test.yml` is present in the repository root.

---

## 🗄️ 6. Database Schema & Migration Status
- [x] **Initial Schema Applied**: Confirm `20260525000000_init_schemas.sql`, `20260525000001_enable_rls.sql`, and `20260525000002_audit_triggers.sql` are applied.
- [x] **Clerk Auth Migration Applied**: Confirm `20260526000000_clerk_auth_migration.sql` has been executed — this changes `firm_members.id` and all 12 child-table FK columns from `UUID` to `TEXT`.
- [x] **Clerk RLS Redesign Migration Applied**: Confirm `20260608000000_clerk_rls_redesign.sql` has been executed — this updates RLS helper functions to be compatible with Clerk.
- [x] **FK Constraints Verified**: Verify that re-created FK constraints on `matter_team_members`, `time_entries`, `notifications`, `user_profiles`, `trust_account_records`, `popia_consents`, `document_versions`, `document_access_logs` are intact.
- [x] **Auth.users FKs Dropped**: Confirm that `audit_logs.user_id` and `client_portal_access.portal_user_id` no longer reference `auth.users(id)` (not applicable with Clerk).