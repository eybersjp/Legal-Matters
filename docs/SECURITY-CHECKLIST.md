# Security Hardening & Regulatory Checklist

This checklist tracks the technical security, data privacy, and legal compliance hardening controls implemented across the **Legal Matters** practice management platform.

---

## ⚙️ 1. Environment Safety
- [ ] **No Committed Secrets**: Verify that no actual environment keys (`SUPABASE_SERVICE_ROLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`, or `ENCRYPTION_SECRET_KEY`) are committed to Git.
- [ ] **Service Role Key Scoped**: Ensure that `SUPABASE_SERVICE_ROLE_KEY` is strictly configured for server-side execution and is never exposed in client scripts or `NEXT_PUBLIC_` variables.
- [ ] **Clerk Secret Key Quarantine**: Confirm that `CLERK_SECRET_KEY` is a server-side only variable and is never exposed in client bundles. It must NOT be prefixed with `NEXT_PUBLIC_`.
- [ ] **Clerk Publishable Key Exposed Safely**: Confirm that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` IS prefixed with `NEXT_PUBLIC_` (client-safe by design). This key is public and identifies the Clerk application — it does not grant admin access.
- [ ] **Test Mode Disabled**: Confirm that `NEXT_PUBLIC_TEST_MODE` is set to `false` or completely omitted on staging and production environments.
- [ ] **Safe Client Variables**: Ensure that client-exposed variables (`NEXT_PUBLIC_VAT_RATE_PERCENT`, etc.) contain only public, non-sensitive configuration metrics.

---

## 💾 2. Supabase Database Hardening
- [ ] **Row Level Security Active**: Verify that RLS is enabled on all 22 core tables (not just 2) — the Clerk auth migration (`20260526000000_clerk_auth_migration.sql`) re-enables it on every table.
- [ ] **Clerk-Compatible RLS Policies**: Verify that all RLS policies use `auth.uid()::TEXT` comparisons (for Clerk user ID compatibility) and filter on `firm_id = get_auth_firm_id()`. The `get_auth_firm_id()` function now looks up by text ID: `WHERE id = auth.uid()::TEXT`.
- [ ] **Application-Layer Multi-Tenant Isolation**: Since the app uses `createAdminClient()` (service role key) for all server actions — bypassing RLS — confirm that every query includes an explicit `.eq('firm_id', ...)` filter. RLS is defense-in-depth.
- [ ] **Clerk Auth Migration Applied**: Confirm `20260526000000_clerk_auth_migration.sql` has been executed. This changes `firm_members.id` from `UUID` to `TEXT` to store Clerk user IDs (e.g. `user_2abc123`) and updates all 12 child-table FK columns.
- [ ] **Auth.users FKs Removed**: Verify that `audit_logs.user_id` and `client_portal_access.portal_user_id` no longer reference `auth.users(id)` — Clerk handles identity, not Supabase Auth.
- [ ] **Storage Bucket Private**: Ensure the `legal-matters-docs` bucket public flag is set to `false`.
- [ ] **Storage Policies Verified**: Confirm bucket RLS policies restrict read/write access solely to authenticated firm members.

---

## 🖥️ 3. Application Hardening
- [ ] **Clerk Middleware Route Protection**: Confirm `app/src/middleware.ts` uses `clerkMiddleware` with `createRouteMatcher` and `auth.protect()` for `/dashboard/*` and `/portal/*` routes. Unauthenticated users must be redirected to `/login`.
- [ ] **Protected Routes Exhaustive**: Verify that the middleware matcher pattern covers all sensitive routes including API routes (`/api`, `/trpc`) and Clerk callback routes (`/__clerk`).
- [ ] **Clerk-Managed Sessions**: Confirm that session management is delegated to Clerk — no custom JWT issuance, cookie management, or session storage in the application code. Clerk handles session cookies, refresh tokens, and expiry automatically.
- [ ] **User Sign-Out Cleans Up**: Verify that `UserButton` sign-out (from `@clerk/nextjs`) or `useClerk().signOut()` in the dashboard layout properly clears the Clerk session and redirects to `/login`.
- [ ] **No Server-Side Auth Bypass**: Verify that all server actions use `requireAuthUser()` from `@/lib/auth` (not inline `requireAuth()` duplicates) and throw or redirect if the user is not authenticated.
- [ ] **Sanitized Error Outputs**: Ensure that transactional operations catch and log exact database errors internally while returning clean, user-friendly messages to client displays without leaking system columns or schema configurations.
- [ ] **Strict Zod Validations**: Verify that all API routes and form inputs validate structural data using Zod (Luhn SA ID calculations, company registration structures).
- [ ] **Document Access Isolation**: Verify documents flagged as `is_privileged` are hidden from non-team members.
- [ ] **Tenant Scoped Notifications**: Verify notification actions load only rows belonging strictly to the current authenticated practitioner user ID.

---

## 🚀 4. Deployment Security
- [ ] **Dashboard Key Settings**: Confirm all variables are set via the Vercel dashboard (including `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`).
- [ ] **Clerk Dashboard URL Registration**: Ensure your Vercel staging URL is added under **Clerk Dashboard → Sites → Application URLs**. Without this, Clerk will reject redirects and sign-in callbacks.
- [ ] **Build Log Inspections**: Check Vercel build output histories to confirm that zero sourcemaps or compile configurations are leaked.
- [ ] **Isolation Check**: Ensure staging is fully isolated and does not reuse production database projects or production Clerk instances.

---

## ⚖️ 5. Legal & Regulatory Compliance
- [ ] **No Claims of Certification**: Ensure the marketing/landing page does not claim that the app is "POPIA Certified" or "LSSA Approved". The correct framing is **"POPIA-conscious workflows"** or **"compliance-supporting features"**.
- [ ] **No Claims of Live Integration**: Ensure that the documents section does not claim live CaseLines synchronizations (pleadings must be uploaded manually in the current MVP).
- [ ] **No Claims of AI Advice**: Verify that the calculator and deadlines sections frame output as administrative computation aids, making zero claims of professional AI legal advice.
- [ ] **Statutory Disclaimer**: Ensure that the footer or login section contains a legal disclaimer stating that calculated court days are tools to support practice supervision and the attorney remains solely responsible for monitoring timelines.
