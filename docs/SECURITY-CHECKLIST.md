# Security Hardening & Regulatory Checklist

This checklist tracks the technical security, data privacy, and legal compliance hardening controls implemented across the **Legal Matters** practice management platform.

---

## ⚙️ 1. Environment Safety
- [ ] **No Committed Secrets**: Verify that no actual environment keys (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, or `ENCRYPTION_SECRET_KEY`) are committed to Git.
- [ ] **Service Role Key Scoped**: Ensure that the Service Role API key is strictly configured for server-side execution and is never exposed in client scripts or NEXT_PUBLIC variables.
- [ ] **Test Mode Disabled**: Confirm that `NEXT_PUBLIC_TEST_MODE` is set to `false` or completely omitted on staging and production environments.
- [ ] **Safe Client Variables**: Ensure that client-exposed variables (`NEXT_PUBLIC_VAT_RATE_PERCENT`, etc.) contain only public, non-sensitive configuration metrics.

---

## 💾 2. Supabase Database Hardening
- [ ] **Row Level Security Active**: Verify that RLS is explicitly enabled on all 2 core tables containing client and firm records.
- [ ] **Multi-Tenant Boundaries**: Verify that all database query policies check `firm_id = get_auth_firm_id()` dynamically.
- [ ] **Storage Bucket Private**: Ensure the `legal-matters-docs` bucket public flag is set to `false`.
- [ ] **Storage Policies Verified**: Confirm bucket RLS policies restrict read/write access solely to authenticated firm members.
- [ ] **Auth Redirect Whitelists**: Ensure that redirect templates configured inside Supabase Auth settings match staging/production routes exclusively.

---

## 🖥️ 3. Application Hardening
- [ ] **Route Protection Middleware**: Confirm Next.js `middleware.ts` automatically blocks and redirects unauthenticated dashboard/portal access to `/login`.
- [ ] **Sanitized Error Outputs**: Ensure that transactional operations catch and log exact Supabase errors internally while returning clean, user-friendly messages to client displays without leaking system columns or schema configurations.
- [ ] **Strict Zod Validations**: Verify that all API routes and form inputs validate structural data using Zod (Luhn SA ID calculations, company registration structures).
- [ ] **Document Access Isolation**: Verify documents flagged as `is_privileged` are hidden from non-team members.
- [ ] **Tenant Scoped Notifications**: Verify notification actions load only rows belonging strictly to the current authenticated practitioner user ID.

---

## 🚀 4. Deployment Security
- [ ] **Dashboard Key Settings**: Confirm all variables are set via the Vercel dashboard.
- [ ] **Build Log Inspections**: Check Vercel build output histories to confirm that zero sourcemaps or compile configurations are leaked.
- [ ] **Isolation Check**: Ensure staging is fully isolated and does not reuse production database projects.

---

## ⚖️ 5. Legal & Regulatory Compliance
- [ ] **No Claims of Certification**: Ensure the marketing/landing page does not claim that the app is "POPIA Certified" or "LSSA Approved". The correct framing is **"POPIA-conscious workflows"** or **"compliance-supporting features"**.
- [ ] **No Claims of Live Integration**: Ensure that the documents section does not claim live CaseLines synchronizations (pleadings must be uploaded manually in the current MVP).
- [ ] **No Claims of AI Advice**: Verify that the calculator and deadlines sections frame output as administrative computation aids, making zero claims of professional AI legal advice.
- [ ] **Statutory Disclaimer**: Ensure that the footer or login section contains a legal disclaimer stating that calculated court days are tools to support practice supervision and the attorney remains solely responsible for monitoring timelines.
