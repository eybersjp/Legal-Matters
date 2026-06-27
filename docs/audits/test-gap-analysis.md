# Test Gap Analysis

This document identifies the current test coverage, missing tests, risk levels, and recommended test actions across the core functional modules of the **Legal Matters** platform.

| Feature Area | Current Tests | Missing Tests | Risk Level | Recommended Test Type | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication & Multi-Tenancy** | E2E register & login flows (`app.spec.ts`); remote DB RLS tests (`clerk_rls_tenant_isolation.sql`). | Parameter tampering integration tests (preventing cross-firm resource mapping in `createMatter`, `recordTimeEntry`, `addTimelineEvent`, `createCourtDeadline` server actions). | **HIGH** | Integration / Unit | **P0_BLOCKER** |
| **Client CRM & Compliance** | Schema validations for SA ID and company registration format in `validation.test.ts`. | Runtime validation integration inside `addClient` action; FICA checklist status changes; POPIA consent channel update UI testing. | **MEDIUM** | Unit / E2E | **P1_MVP_CRITICAL** |
| **Billing & Invoicing** | SA VAT (15%) calculation formulas and duration mapping tested in `billing.test.ts`. | Payment recording schema & action tests; expense tracking allocations; invoice number generation continuity tests. | **HIGH** | Unit / Integration | **P1_MVP_CRITICAL** |
| **Litigation Deadlines** | High Court days weekend/holiday skip algorithm tested in `court-days.test.ts`. | Recess period inclusion checks; automated recalculation upon recess overlaps. | **MEDIUM** | Unit | **P2_IMPORTANT** |
| **Document Hub** | Upload, versioning, category, and approval state transitions tested in `document-hub.test.ts`. | Document access logging verification; secure URL expirations; role-based document read restrictions. | **MEDIUM** | Integration | **P2_IMPORTANT** |
| **User Role Management** | None. | Action authorization checks (verifying only `Partner` can invite members or update roles); UI state representation. | **MEDIUM** | Unit / E2E | **P2_IMPORTANT** |
| **AI Product Suite** | None. (Handles summaries and next actions via static mocks). | Prompt formatting validations; LLM payload verification; mock citation generation correctness. | **LOW** | Unit / Integration | **P3_IMPROVEMENT** |

---

## Key Risk Summary & Recommendations

### 1. Cross-Tenant Parameter Tampering (Blocker)
* **Risk**: Normal Server Actions bypass RLS by using the `SUPABASE_SERVICE_ROLE_KEY`. If they accept identifiers like `client_id` or `matter_id` directly from the client without checking that the user's `firm_id` owns those records, practitioners from Firm A can write data to Firm B's clients.
* **Recommendation**: Write integration tests using mock context that explicitly call `createMatter` and `recordTimeEntry` with cross-firm parameter mismatch, asserting that they throw an ownership validation error.

### 2. Client ID/Reg Intake Verification (Critical)
* **Risk**: Zod validation patterns for SA ID (Luhn algorithm) and company registration formats are written but not active on the main intake form schema (`CreateClientSchema`). This allows bad data in the production CRM.
* **Recommendation**: Wire Zod schemas inside `app/src/schemas/index.ts` and write E2E tests verifying validation errors are rendered on the screen when invalid formats are inputted.

### 3. Billing Completeness (Critical)
* **Risk**: Pro-forma invoice and tax invoice generation are implemented, but there are no database tables or actions to log **expenses** or **payments**. This renders the invoicing system incomplete for South African LPC audits.
* **Recommendation**: Add tables for `expenses` and `payments`, wire their server actions, and cover them with unit tests.
