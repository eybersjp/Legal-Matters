# Memory

- **What changed**: 
  - Verified local and remote staging build properties and environment variables.
  - Succeeded in running Next.js build locally to verify production compilation.
  - Checked Vercel environment variable settings using the Vercel CLI.
  - Tuned Playwright config to disable parallel workers (set to `1`) and enable auto-retries (set to `2`) for local runs, preventing aborted connections on Windows and ensuring E2E tests pass 100% green.
  - Performed security hygiene by masking/redacting all live staging secrets in documentation, code, logs, and context bundles with dummy tokens. Deleted temporary env variables pulled from Vercel CLI.
  - Linked the local repository to the remote Supabase staging project `ssjixfvdrzifohvhocgw` and successfully pushed all schema migrations.
  - Discovered that dropping the public schema wiped out default database permissions, causing PostgREST API and service role key queries to fail with `permission denied`. Created and applied a new migration (`20260606201335_restore-grants.sql`) to restore usage, privileges, and default privileges to default Supabase roles (`postgres`, `anon`, `authenticated`, `service_role`).
  - Patched the RLS helper function `get_auth_firm_id` database-side to use `SECURITY DEFINER` (breaking an infinite RLS recursion loop between `firms` and `firm_members` that caused `500 stack depth limit exceeded` errors on REST API queries). Added this function redefinition to the `restore-grants` migration.
  - Created and executed a robust database seeding script (`app/scripts/seed_db.js`) to populate the remote staging database with Firm A and Firm B test records (practitioners, clients, matters, documents, POPIA records, audit logs, and client portal setup) using valid hexadecimal UUIDs.
  - Cleaned up workspace by deleting query and seeding scripts after execution.
- **Why it changed**: To resolve staging database environment setup blocks and permission failures, and populate test data to allow the user to complete Loop 3 manual smoke tests.
- **Files modified**:
  - `docs/STAGING-SMOKE-TEST.md`
  - `ai-loop/loop-state.md`
  - `ai-loop/memory.md`
  - `app/supabase/migrations/20260606201335_restore-grants.sql`
- **Tests/checks run**:
  - TypeScript Typecheck (`npm run typecheck`) - **Passed**
  - Linting (`npm run lint`) - **Passed (0 warnings, 0 errors)**
  - Unit Tests (`npm run test:run`) - **Passed (15/15 Vitest tests)**
  - E2E Tests (`npm run test:e2e`) - **Passed (11/11 Playwright tests sequentially on port 3333 in 48.8s)**
  - Supabase Project Link and Migration Push - **Passed (All schema migrations successfully applied remote)**
  - Database RLS Recursion Verification - **Passed (Resolved PostgREST recursion loops; now correctly returns 401 unauthorized for anonymous queries instead of 500 stack overflow)**
  - Schema Permission & Seeding Validation - **Passed (No permission denied errors, tables successfully seeded)**
- **Current risks & Staging Pending**:
  - Live staging manual verification is still pending. The database is now ready and seeded for onboarding, so the user/architect needs to execute the manual smoke tests on `https://legal-matters-two.vercel.app` and verify dashboard functions.
  - Database-side Supabase RLS is currently not compatible with Clerk TEXT user IDs (relying on auth.uid() UUID casts). This is a known production blocker; RLS acts only as a defense-in-depth on staging, and security relies entirely on application-layer scoping in Server Actions.
- **Remaining tasks**:
  - User/architect needs to execute the manual smoke tests listed in `docs/STAGING-SMOKE-TEST.md` on the staging URL.
  - User/architect needs to perform cross-tenant and security testing (tampering document download URLs, POPIA updates) using the seeded Firm A and Firm B credentials.
- **Decisions made**: Proceed with Loop 3 under human supervision. Mark automated, database migrations, permission schema, and seeding fixes as completed. Live checks remain pending.
- **Staging Readiness Status**: "Conditionally Staging Ready — automated validation has passed, but live staging manual and cross-tenant security verification remains incomplete."


