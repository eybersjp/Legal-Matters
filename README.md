# Legal Matters — South African Practice Management Platform MVP

**Legal Matters** is a modern, secure, and multi-tenant South African legal practice management operating system. Built for law practices to coordinate intake, matters, case tasks, court pleading deadlines, document history, and trust/business ledger compliance.

---

## Current Status: Phase 2 Release Candidate
The platform is currently locked as a **Phase 2 Release Candidate**. 

- **Staging URL**: [https://legal-matters-two.vercel.app](https://legal-matters-two.vercel.app)
- **Deployment Status**: Verified and active on Vercel.
- **Staging Database**: Supabase remote database with Row Level Security (RLS) policies and complete multi-tenant scoping.
- **Staging E2E Verification**: 14/14 Playwright E2E tests passing against the remote staging URL using real Clerk credentials.

---

## Local Setup & Development

### 1. Prerequisites
- Node.js v20+
- Supabase CLI (for local migration testing)
- Clerk account credentials

### 2. Environment Configuration
Create an `app/.env.local` file with the following environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# For local testing bypass (development bounds only)
E2E_TEST_MODE="true"
```

### 3. Run Locally
Install dependencies and start the Next.js development server:
```bash
# From the workspace root:
npm --prefix app install
npm --prefix app run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Verification & Testing Suite

All tests can be executed from the workspace root:

### 1. TypeScript Validation
Ensure type-safety across all routes, actions, and schemas:
```bash
npm --prefix app run typecheck
```

### 2. Code Quality & Linting
Run Next.js linter checks:
```bash
npm --prefix app run lint
```

### 3. Unit & Integration Tests (Vitest)
Executes all 114 backend actions, schema validations, and regression assertions:
```bash
npm --prefix app run test:run
```

### 4. Row Level Security (RLS) Policy Tests
Checks multi-tenant isolation helpers and verifies that public role access to policy checkers is restricted:
```bash
npm --prefix app run test:db
```

### 5. Playwright E2E Tests (Local)
Runs client flow integration tests locally using mock authentication:
```bash
npm --prefix app run test:e2e
```

### 6. Remote Authenticated Playwright E2E (Staging)
Runs complete E2E smoke tests against the live staging URL using real Clerk authentication:
```bash
# 1. Seed the staging database for the test user
E2E_CLERK_EMAIL="your-test-email@domain.com" node app/scripts/seed-staging.js

# 2. Run remote smoke tests
E2E_CLERK_EMAIL="your-test-email@domain.com" E2E_CLERK_PASSWORD="your-test-password" npm --prefix app run test:e2e:staging
```

---

## Core Technical Conventions
- **Multi-Tenant Scoping**: Direct client-side queries to Supabase are disabled. All database operations execute server-side via Next.js Server Actions using `createAdminClient()`. Action inputs must be filtered with `.eq('firm_id', auth.firmId)` strictly resolved from the Clerk context.
- **POPIA Compliance**: Personal Identifiable Information (PII) is gated behind checkbox consent, and document uploads are saved to private partitioned bucket paths using server-generated UUIDs.
- **Audit Logs**: Database mutations and security operations are audited in the `audit_logs` table.

For detailed release checklists, demo walkthroughs, and roadmaps, refer to:
- [docs/PHASE_2_RELEASE_CANDIDATE.md](file:///c:/Users/SSTECH/developments/legal-matters/docs/PHASE_2_RELEASE_CANDIDATE.md)
- [docs/DEMO_SCRIPT.md](file:///c:/Users/SSTECH/developments/legal-matters/docs/DEMO_SCRIPT.md)
- [docs/KNOWN_LIMITATIONS.md](file:///c:/Users/SSTECH/developments/legal-matters/docs/KNOWN_LIMITATIONS.md)
- [docs/NEXT_PHASE_RECOMMENDATIONS.md](file:///c:/Users/SSTECH/developments/legal-matters/docs/NEXT_PHASE_RECOMMENDATIONS.md)
