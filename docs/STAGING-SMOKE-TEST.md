# Staging Environment Smoke Test Suite

This document outlines the manual verification checks to execute on your live staging deployment to verify operational health, multi-tenancy isolation, and POPIA privacy controls.

---

## 📋 Staging Verification Checklists

### 🌐 1. Public Pages
- [ ] **1. Landing Page Loads**: Navigate to `/`. Confirm that all marketing panels, trust bars, features, solutions, pricing, and footer columns render with responsive sizing.
- [ ] **2. Register Page Loads**: Navigate to `/register`. Confirm all onboarding input columns (LPC Practising Number, Firm Registered Name) are visible.
- [ ] **3. Login Page Loads**: Navigate to `/login`. Verify login forms, input fields, and register account redirection prompts.

### 🔑 2. Authentication & Session Checks
- [ ] **4. User Registration Flow**: Complete registration at `/register`. Confirm that your new firm account is created and redirects successfully to `/login?registered=true`.
- [ ] **5. User Login Flow**: Log in using your admin credentials. Verify redirection to `/dashboard`.
- [ ] **6. User Logout Flow**: Click **Sign Out** at the bottom of the navigation sidebar. Confirm redirection back to `/login` and session clearing.
- [ ] **7. Logged-out Block**: Log out, then try to navigate directly to `/dashboard`. Verify that access is denied.
- [ ] **8. Logged-out Redirect**: Confirm the middleware successfully redirects any unauthenticated dashboard lookup to `/login`.

### 🏛️ 3. Dashboard Interface & Navigation
- [ ] **9. Dashboard Home Loads**: Verify dashboard stats (Matters, Clients, Billable ZAR, Trust balance) load without errors.
- [ ] **10. Dashboard Navigation works**: Click through each sidebar link and verify fast loading.
- [ ] **11. Clients Page Loads**: Confirm client list table and "Add Client" buttons render cleanly.
- [ ] **12. Matters Page Loads**: Confirm matter list table and case files index render cleanly.
- [ ] **13. Documents Page Loads**: Confirm the generic `/dashboard/documents` global explorer list loads.
- [ ] **14. Notifications Bell Renders**: Select the Bell icon in the header. Verify the notifications center dropdown opens, listing unread alerts.
- [ ] **15. Mobile Navigation Menu**: Resize browser width to `375px` (mobile viewport). Confirm that the header toggle button successfully triggers the sidebar drawer overlay.

### 💾 4. Operational Data Workflows
- [ ] **16. Client Onboarding Form**: Click **Add Client** inside Clients Registry. Fill in FICA data. Verify FICA registry validations block invalid inputs.
- [ ] **17. Matter Creation Form**: Navigate to Matters Registry and click **Add Matter**. Complete intake. Verify the case folder is created.
- [ ] **18. Document Upload**: Navigate to your matter's document tab. Upload a case file. Confirm it uploads to storage.
- [ ] **19. Court Deadline Calculator**: Input a trigger date and calculation rule (e.g. 10 court days). Confirm the computed due date excludes weekends and South African public holidays.
- [ ] **20. POPIA Consent Recording**: On your client profile, toggle processing consent settings. Confirm the changes are recorded.
- [ ] **21. Time Entry & Billing**: Create a time entry (hourly rate, duration, description) and click **Issue Invoice**. Verify the tax invoice breaks down VAT at 15%.

### 🔒 5. Row Level Security & Multi-Tenancy Isolation
- [ ] **22. Cross-Firm Client Block**: With Firm B credentials, attempt to fetch a client row belonging to Firm A:
  ```
  https://staging.your-app.vercel.app/dashboard/clients/[firm-a-client-uuid]
  ```
  Confirm access is denied (RLS works).
- [ ] **23. Cross-Firm Matter Block**: Attempt to fetch Firm A matters using Firm B session cookies. Verify access is blocked.
- [ ] **24. Cross-Firm Document Block**: Attempt to download a document version file from storage belonging to Firm A. Verify access is blocked.
- [ ] **25. Privilege Quarantine**: Log in as a Client Portal user. Try to look at a file flagged as `is_privileged = true`. Verify it is hidden, confirming legal privilege quarantine.
- [ ] **26. Private Storage Bucket**: Verify that documents uploaded to the bucket are private and cannot be listed or downloaded anonymously.
- [ ] **27. Test Mode Disabled**: Open browser dev tools and confirm that `NEXT_PUBLIC_TEST_MODE` is not active on staging.

### 📜 6. Compliance Auditing
- [ ] **28. Document Access Logs**: Navigate to client documents and click **Get**. Confirm a corresponding read entry is instantly written into `document_access_logs`.
- [ ] **29. Sensitive Changes Audited**: Check that modifications to PII (client address, registration details) write corresponding rows in `audit_logs`.
- [ ] **30. Consent Changes Audited**: Verify that updating a client's POPIA processing settings generates a secure log event.

---

## 📈 Acceptance & Sign-off

### Staging Validation Status
* [ ] **PASS**: All 30 checks have passed cleanly with zero errors.
* [ ] **PASS WITH RISKS**: Minor issues found (noted below) but core tenant isolation, compliance, and RLS are secure.
* [ ] **FAIL**: Critical issues found (data leaks, auth bypasses, or crashing routes).

### Verification Sign-off Registry

| Tester Name | Verification Date | Staging URL | Supabase Project Ref | Commit Hash | Verdict | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `[Enter Name]` | `YYYY-MM-DD` | `https://staging...` | `your-staging-project` | `[Commit SHA]` | `[PASS/FAIL]` | `[Enter Details]` |
