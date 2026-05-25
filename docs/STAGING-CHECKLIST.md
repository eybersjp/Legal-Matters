# Staging Deployment Readiness Checklist

This checklist tracks the deployment validation requirements for the **Legal Matters** platform prior to pushing the MVP v1 to the staging environment.

---

## 🔒 1. Row Level Security (RLS) & Multi-Tenant Isolation
- [ ] **Tables Audited**: Confirm that `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` has been executed on all 22 core tables in the Supabase schema.
- [ ] **Isolation Policies**: Verify that every `SELECT`, `INSERT`, `UPDATE`, and `DELETE` RLS policy explicitly filters on `firm_id = get_auth_firm_id()`.
- [ ] **Cross-Firm Isolation Test**: Attempt to fetch matter rows belonging to Firm B using a Firm A session token. Ensure that zero rows are returned.
- [ ] **Privilege Quarantine Policies**: Verify that users with the role `External Counsel` or `Client` are strictly blocked from seeing document records where `is_privileged = true`.

---

## 📜 2. South African POPIA & Regulatory Compliance
- [ ] **Luhn SA ID Checks**: Verify that client onboarding flows reject non-compliant South African 13-digit identity numbers.
- [ ] **LPC Registration Verification**: Ensure that the signing up firm provides a valid Law Society of South Africa / Legal Practice Council practice number.
- [ ] **POPIA Consent Flags**: Check that individual/corporate client additions capture granular processing consent and communication channel flags.
- [ ] **Immutable Audit Logging**: Confirm that all read accesses to sensitive personal data (e.g. client profile viewing) successfully write structured records to the `audit_logs` table.
- [ ] **Section 86 Trust Protection**: Verify that the trust metadata layer prevents mixing client trust balances with the firm's operational accounts.

---

## ⚙️ 3. Environment Variable Safety & Test Mode Guards
- [ ] **Production Guards**: Verify that the `NEXT_PUBLIC_TEST_MODE` E2E mock bypass has an active guard checking `process.env.NODE_ENV !== 'production'`.
- [ ] **Symmetric Encryption Keys**: Ensure that the `ENCRYPTION_SECRET_KEY` is a unique, hex-encoded 32-character key generated via secure random sources (not reusing example keys).
- [ ] **Supabase Key Quarantine**: Confirm that `SUPABASE_SERVICE_ROLE_KEY` is only available on the server-side environment and is never exposed in client bundles.

---

## 🚀 4. Build, Lint, & CI Pipeline
- [ ] **Compile Success**: Run `npm run typecheck` and verify there are zero TypeScript compiler warnings.
- [ ] **Code Linting Check**: Run `npm run lint` and verify full compliance.
- [ ] **Unit Tests Passed**: Run `npm run test:run` and verify all 15 Vitest tests are green.
- [ ] **CI Pipeline Checked**: Confirm `.github/workflows/test.yml` is present in the repository root.
