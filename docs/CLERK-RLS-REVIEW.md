# Clerk Auth & Supabase RLS Compatibility Review

This document provides a comprehensive review of Supabase Row Level Security (RLS) policies following the migration to Clerk Authentication in the **Legal Matters** practice management platform.

---

## 🔍 1. Scope of Review
We reviewed the following files and database constructs:
- Initial database RLS policies in `app/supabase/migrations/20260525000001_enable_rls.sql`
- Modified RLS policies in `app/supabase/migrations/20260526000000_clerk_auth_migration.sql`
- Supabase client initialization in `app/src/lib/supabase/server.ts`
- Server-side data access methods in `app/src/server/actions/*.ts`

---

## ⚙️ 2. Supabase Access & Enforcement Model

### Service-Role Privileged Access
- **Normal Application Queries**: All data access queries inside the server actions (`app/src/server/actions/`) use the `createAdminClient()` helper. 
- This client is instantiated using the `SUPABASE_SERVICE_ROLE_KEY`. Because it uses the service role key, all queries executed through server actions **bypass Row Level Security (RLS) entirely**.
- **Security Boundaries**: Multi-tenant isolation and role-based permissions are enforced at the **application layer** (inside the server actions) by:
  1. Obtaining verified user identity from Clerk (`auth()`).
  2. Resolving the user's `firm_id` and role from the database.
  3. Explicitly adding `.eq('firm_id', firmId)` to every database query.

### Role of RLS
- Currently, RLS acts as a **defense-in-depth** measure. 
- It prevents unauthorized access in case direct database connections are established or if a developer accidentally instantiates an unprivileged client (`createClient()`) instead of the admin client.

---

## 🚨 3. Identified RLS Compatibility Risks

### 1. The `auth.uid()` Type Mismatch Crash
- **The Issue**: Standard Supabase RLS policies rely on `auth.uid()`, which is defined as `returns uuid`. Clerk user IDs (e.g. `user_2abc123`) are text strings.
- **The Risk**: The helper function `get_auth_firm_id()` in `20260526000000_clerk_auth_migration.sql` contains the following code:
  ```sql
  SELECT firm_id FROM firm_members WHERE id = auth.uid()::TEXT LIMIT 1
  ```
  Calling `auth.uid()` will attempt to cast the JWT `sub` claim to a UUID. Since Clerk user IDs are not UUIDs, this cast throws a PostgreSQL type exception. Any query subject to RLS will fail and crash.

### 2. RLS Policy Infinite Recursion
- **The Issue**: The `get_auth_firm_id()` function queries `firm_members` to resolve the user's firm.
- **The Risk**: `firm_members` itself has an RLS policy that references `get_auth_firm_id()`:
  ```sql
  CREATE POLICY select_members ON firm_members FOR SELECT USING (firm_id = get_auth_firm_id());
  ```
  When a query triggers RLS on `firm_members`, it calls `get_auth_firm_id()`, which queries `firm_members`, which triggers RLS, causing **infinite recursion** and database connection exhaustion.
- **The Fix**: The functions must be defined with `SECURITY DEFINER` and `SET search_path = public` to bypass RLS evaluation during internal lookup.

### 3. Weakened RLS Security Policies
- **The Issue**: The migration script `20260526000000_clerk_auth_migration.sql` simplified several RLS policies:
  - Removed role check validation (e.g. only `Partner` can write to `firm_members`).
  - Removed client portal boundaries (clients could originally only see their own records).
  - Removed matter team scopes (external counsel could originally only see matters they were assigned to).
- **The Risk**: If the application client is ever switched to unprivileged client-side queries, this simplification exposes the database to privilege escalation and tenant cross-access.

---

## 🔑 4. Clerk JWT-to-Supabase RLS Strategy

### Current Repository State & Staging Verification
- **Redesigned Helpers**: The RLS helper functions (`get_auth_user_id()`, `get_auth_firm_id()`, and `get_auth_role()`) have been successfully redesigned, deployed to the remote database via migration `20260608000000_clerk_rls_redesign.sql`, and verified.
- **Verification Success**: The automated test script (`npm run test:db`) has verified that:
  - `get_auth_user_id()` safely parses string-based Clerk user IDs without UUID type casting exceptions.
  - `get_auth_firm_id()` resolves the user's firm ID safely using `SECURITY DEFINER` without recursion.
  - `get_auth_role()` resolves the user's role safely using `SECURITY DEFINER`.
- **JWT Injection Constraint**: Although the database-side helpers are now fully compatible and safe, direct client-side Supabase queries are still **blocked**. Client-side Clerk JWT injection into Supabase is not yet end-to-end implemented or verified in the frontend application layer. All database queries and mutations must continue to proceed exclusively via Next.js Server Actions using the service-role client.

---

## 🛡️ 5. Current RLS Status & Enforced Strategy

1. **Enforced Data Access Boundary**: All database actions must go through Next.js Server Actions. Direct client-side Supabase queries remain blocked because client-side JWT injection is not end-to-end verified in code.
2. **Database-Side RLS Enforcement**: The RLS helper functions are fully deployed and function as a robust defense-in-depth boundary.
3. **Hardened verify_rls_helpers()**: Execution permissions for `verify_rls_helpers()` are strictly revoked from `public`, `anon`, and `authenticated`, limiting access to `service_role` only.

