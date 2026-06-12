# Legal Matters - AI Developer Rules (CLAUDE.md)

## Tech Stack
- **Frontend**: Next.js 15+ (App Router), React 18, Tailwind CSS v3
- **Database**: Supabase (PostgreSQL 14+)
- **Authentication**: Clerk (`@clerk/nextjs` v7+)
- **Validation**: Zod (runtime validation)
- **Testing**: Vitest (unit/integration) and Playwright (E2E)

## Commands
Run all commands from the workspace root (or prefix with `npm --prefix app ...`):
- Dev server: `npm --prefix app run dev`
- Production build: `npm --prefix app run build`
- Type checking: `npm --prefix app run typecheck`
- Linter: `npm --prefix app run lint`
- Vitest unit tests: `npm --prefix app run test:run` (or `npm --prefix app run test` for watch mode)
- Playwright E2E tests: `npm --prefix app run test:e2e` (runs sequentially on port `3333`)
- Database RLS tests: `npm --prefix app run test:db` (runs `node scripts/run-rls-tests.js`)

## Code Conventions

### 1. Multi-Tenant Data Isolation
- **Boundary**: Direct client-side Supabase queries or mutations are strictly blocked. All database operations must execute server-side via Next.js Server Actions or server-only API routes.
- **Enforcement**: 
  - Every server action must resolve the user session via `requireAuthUser()` or `getAuthUser()`.
  - Database queries must use the service role admin client (`createAdminClient()`).
  - You must explicitly append `.eq('firm_id', auth.firmId)` to every query or mutation to restrict access to the user's tenant.
  - Never trust user-submitted `firm_id` parameters; resolve it strictly from Clerk session metadata.

### 2. Database RLS (Defense-in-Depth)
- Row Level Security (RLS) is enabled on all tables as defense-in-depth.
- Custom helpers `get_auth_user_id()`, `get_auth_firm_id()`, and `get_auth_role()` support string-based Clerk IDs (which are `TEXT`, not `UUID`).
- RLS policies must not be bypassed or weakened during database migrations.

### 3. South Africa Legal Compliance
- **POPIA (2013)**: Explicit consent is required before collecting/processing personal information. Sensitive data must be encrypted at rest.
- **Audit Logs**: All critical data mutations, PII access, and actions must write structured logs to the `audit_logs` table.
- **File Storage**: User-uploaded files must be saved with server-side generated paths using the convention: `${firm_id}/${matter_id}/${uuid}${extension}`. Never use original filenames in storage paths. Maximum file size is 5 MB.

### 4. File Structure & Naming
- Next.js Server Actions: `app/src/server/actions/*.actions.ts`
- Database Utility client: `app/src/lib/supabase/server.ts`
- Auth Context resolver: `app/src/lib/auth.ts`
- Unit tests: `app/src/tests/*.test.ts` (Vitest)
- E2E tests: `app/playwright/tests/*.spec.ts` (Playwright)

## Key Code Patterns

### Standard Server Action Pattern
```typescript
'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';

export async function getMattersList() {
  // 1. Resolve user and firm identity (throws if unauthenticated or not linked)
  const auth = await requireAuthUser();

  // 2. Instantiate administrative database client
  const adminDb = createAdminClient();

  // 3. Query records with strict tenant filtering
  const { data, error } = await adminDb
    .from('matters')
    .select('id, title, case_number, status')
    .eq('firm_id', auth.firmId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch matters:', error);
    throw new Error('Database operation failed');
  }

  return data;
}
```
