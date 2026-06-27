# Staging Environment Smoke Test Suite

This document outlines the manual verification checks to execute on your live staging deployment to verify operational health, multi-tenancy isolation, and POPIA privacy controls.

---

## 📋 Staging Verification Checklists

### 🌐 1. Public Pages
- [ ] **1. Landing Page Loads**: Navigate to `/`. Confirm that all marketing panels, trust bars, features, solutions, pricing, and footer columns render with responsive sizing.
- [ ] **2. Register Page Loads**: Navigate to `/register`. Confirm all onboarding input columns (LPC Practising Number, Firm Registered Name) are visible.
- [ ] **3. Login Page Loads**: Navigate to `/login`. Verify the Clerk-hosted sign-in form renders with email and password fields.

### 🔑 2. Authentication & Session Checks (Clerk-Managed)

> **Note:** Authentication is now handled entirely by **Clerk**. Sign-in and sign-up use Clerk's hosted UI components. Session management, MFA, and password reset are managed through the Clerk dashboard at [dashboard.clerk.com](https://dashboard.clerk.com). The custom `loginUser` server action has been removed — `clerkMiddleware` protects all dashboard/portal routes.

- [ ] **4. User Registration Flow — Clerk Sign-Up**: Navigate to `/register`. Complete the Clerk-hosted sign-up form. After successful sign-up, the server action creates the firm record, `firm_members` entry, and `user_profiles` row with the Clerk user ID (e.g. `user_2abc123`). Verify redirect to `/login`.
- [ ] **5. User Login Flow — Clerk Sign-In**: Navigate to `/login`. Enter your email and password in the Clerk sign-in form. Verify redirection to `/dashboard`.
- [ ] **6. User Sign-Out via UserButton**: Click the **User Button** (top-right user avatar) → select **Sign out**. Confirm the session ends and you're redirected to `/login`.
- [ ] **7. Clerk Middleware Protection**: After signing out, try to navigate directly to `/dashboard`. Verify that `clerkMiddleware` redirects you to `/login`.
- [ ] **8. Protected Route Block**: Confirm that `/portal/*` routes are also protected by `clerkMiddleware` and redirect unauthenticated users.
- [ ] **9. Clerk Session Persistence**: Refresh the browser while logged in. Verify the session persists and the dashboard loads immediately without re-authentication.

### 🏛️ 3. Dashboard Interface & Navigation
- [ ] **10. Dashboard Home Loads**: Verify dashboard stats (Matters, Clients, Billable ZAR, Trust balance) load without errors.
- [ ] **11. Dashboard Navigation works**: Click through each sidebar link and verify fast loading.
- [ ] **12. Clients Page Loads**: Confirm client list table and "Add Client" buttons render cleanly.
- [ ] **13. Matters Page Loads**: Confirm matter list table and case files index render cleanly.
- [ ] **14. Documents Page Loads**: Confirm the generic `/dashboard/documents` global explorer list loads.
- [ ] **15. Notifications Bell Renders**: Select the Bell icon in the header. Verify the notifications center dropdown opens, listing unread alerts.
- [ ] **16. Mobile Navigation Menu**: Resize browser width to `375px` (mobile viewport). Confirm that the header toggle button successfully triggers the sidebar drawer overlay.

### 💾 4. Operational Data Workflows
- [ ] **17. Client Onboarding Form**: Click **Add Client** inside Clients Registry. Fill in FICA data. Verify FICA registry validations block invalid inputs.
- [ ] **18. Matter Creation Form**: Navigate to Matters Registry and click **Add Matter**. Complete intake. Verify the case folder is created.
- [ ] **19. Document Upload**: Navigate to your matter's document tab. Upload a case file. Confirm it uploads to storage.
- [ ] **20. Court Deadline Calculator**: Input a trigger date and calculation rule (e.g. 10 court days). Confirm the computed due date excludes weekends and South African public holidays.
- [ ] **21. POPIA Consent Recording**: On your client profile, toggle processing consent settings. Confirm the changes are recorded.
- [ ] **22. Time Entry & Billing**: Create a time entry (hourly rate, duration, description) and click **Issue Invoice**. Verify the tax invoice breaks down VAT at 15%.

### 🔒 5. Row Level Security & Multi-Tenancy Isolation

> **Note:** The app uses `createAdminClient()` (service role key) for all server actions, bypassing Supabase RLS. Multi-tenant isolation is enforced at the **application layer** via explicit `.eq('firm_id', ...)` filters on every server action query. The RLS policies on the database serve as **defense-in-depth**. Ensure the Clerk auth migration (`20260526000000_clerk_auth_migration.sql`) has been applied so `firm_members.id` accepts TEXT Clerk user IDs.

- [ ] **23. Cross-Firm Client Block**: With Firm B credentials, attempt to fetch a client row belonging to Firm A:
  ```
  https://staging.your-app.vercel.app/dashboard/clients/[firm-a-client-uuid]
  ```
  Confirm access is denied (application-layer `firm_id` filter works).
- [ ] **24. Cross-Firm Matter Block**: Attempt to fetch Firm A matters using Firm B session cookies. Verify access is blocked.
- [ ] **25. Cross-Firm Document Block**: Attempt to download a document version file from storage belonging to Firm A. Verify access is blocked.
- [ ] **26. Privilege Quarantine**: Log in as a Client Portal user. Try to look at a file flagged as `is_privileged = true`. Verify it is hidden, confirming legal privilege quarantine.
- [ ] **27. Private Storage Bucket**: Verify that documents uploaded to the bucket are private and cannot be listed or downloaded anonymously.
- [x] **28. Test Mode Disabled**: Open browser dev tools and confirm that `E2E_TEST_MODE` is not active on staging (Vercel env vars confirmed `E2E_TEST_MODE` is unset or set to `false` for staging/production, and never exposed to the client).

### 📜 6. Compliance Auditing
- [ ] **29. Document Access Logs**: Navigate to client documents and click **Get**. Confirm a corresponding read entry is instantly written into `document_access_logs`.
- [ ] **30. Sensitive Changes Audited**: Check that modifications to PII (client address, registration details) write corresponding rows in `audit_logs`.
- [ ] **31. Consent Changes Audited**: Verify that updating a client's POPIA processing settings generates a secure log event.

---

## 🔐 Clerk-Specific Staging Checks

### Clerk Dashboard Configuration
- [ ] **32. Clerk Application Created**: Verify a Clerk application exists at [dashboard.clerk.com](https://dashboard.clerk.com) for this project.
- [ ] **33. Staging URL Registered**: Add your Vercel staging URL (e.g. `https://legal-matters-two.vercel.app`) under Clerk Dashboard → **Sites** → **Application URLs**.
- [x] **34. Clerk Keys Set in Vercel**: Confirm `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are configured in the Vercel staging environment variables. (Confirmed on 2026-06-06).

### User Lifecycle
- [ ] **35. Clerk User Created**: After registering a new firm, verify the user appears in Clerk Dashboard → **Users**.
- [ ] **36. Firm Record Created**: Verify that the `registerFirm` server action created the firm record, `firm_members` row (with Clerk user ID as TEXT), and `user_profiles` row in the database.
- [ ] **37. UserProfile Row**: Query `SELECT * FROM user_profiles WHERE member_id = 'user_2abc...'` and confirm the profile is linked correctly.

### Database State
- [x] **38. ID Type Verified**: Run `SELECT data_type FROM information_schema.columns WHERE table_name = 'firm_members' AND column_name = 'id'` and confirm it returns `text`. (Confirmed in `20260526000000_clerk_auth_migration.sql` schema migration).
- [x] **39. Child Table FKs Intact**: Run `SELECT * FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name IN ('time_entries', 'notifications', 'user_profiles')` and confirm constraints exist. (Confirmed in migrations and schema check).

---

## 📈 Acceptance & Sign-off

### Staging Validation Status
* [ ] **PASS**: All **39 checks** have passed cleanly with zero errors.
* [ ] **PASS WITH RISKS**: Minor issues found (noted below) but core tenant isolation, compliance, and RLS are secure.
* [ ] **FAIL**: Critical issues found (data leaks, auth bypasses, or crashing routes).

### Verification Sign-off Registry

| Tester Name | Verification Date | Staging URL | Supabase Project Ref | Commit Hash | Verdict | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `[Enter Name]` | `YYYY-MM-DD` | `https://staging...` | `ssjixfvdrzifohvhocgw` | `[Commit SHA]` | `[PASS/FAIL]` | `[Enter Details]` |
