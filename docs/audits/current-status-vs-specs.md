# Current Status vs. Specifications Audit

**Legal Matters Platform Audit Report**  
*Date of Audit: June 12, 2026*  
*Auditor: Principal Product Architect & Security Auditor*  
*Maturity Score: 78/100*  
*MVP Readiness: 85%*

---

## 1. Executive Summary
The **Legal Matters** platform has established a highly secure and compliant core framework, integrating Next.js 15 (App Router), Supabase (PostgreSQL), and Clerk Authentication. Automated RLS helper functions are deployed database-side to prevent multi-tenant cross-talk. Crucial workflows like the Secure Document Hub, Court Day Calculations, and POPIA Consent tracking are functional, with 22/22 unit tests and 12/12 E2E Playwright tests passing.

However, several critical data linkage and validation gaps exist in the Server Actions layer where parameters are accepted from the client without verification of firm ownership. Addressing these is crucial to achieving production-level tenant isolation.

---

## 2. Status Classification Summary

### COMPLETE
- **Multi-Tenant User Auth**: Clerk-based authentication with session protection and middleware gates.
- **Dynamic RLS Schema**: Deployed Clerk-compatible RLS functions (`get_auth_user_id()`, `get_auth_firm_id()`, and `get_auth_role()`) using `SECURITY DEFINER` and `SET search_path = public`.
- **Document Hub Core**: Random storage path mapping (`${firm_id}/${matter_id}/${uuid}${ext}`), upload flow, versioning, AI placeholder summaries, and approval/rejection workflows.
- **Court Days Calculation**: Excluding weekends and SA public holidays (with unit and E2E test verification).
- **Practice Control Center Bento Dashboard**: Rendering stats cards, impending court days calendar, and audit logs.

### PARTIAL
- **Client CRM**: Add client, list clients, and view profile. POPIA consent channels can be updated, but Luhn SA ID and company registration number formats are not enforced at runtime.
- **Matter OS**: Matter details and activity timeline events are functional. However, closing workflows, editing matter details, and custom matter number generation are missing.
- **Billing basics**: Time entries list and pro-forma/tax invoice generation with sequential number mapping are implemented. Expenses, payment recording, and unbilled dashboard calculations are missing.

### MISSING
- **FICA Checklist**: No UI or server action to track FICA documentation status (SA ID, proof of address, etc.).
- **User Role Management**: No UI screen to invite firm members, change roles, or toggle member status.
- **High Court Recess Recalculations**: Standard recess recess periods are not dynamically factored into court day calculations.
- **POPIA Retention & Deletion Scheduler**: No automated cron or query triggers to purge data upon POPIA consent expiry or after the statutory LPC 7-year retention period.
- **Real AI OCR / Summarization**: AI summarization is handled strictly via deterministic placeholders.

### OUT_OF_SCOPE_FOR_MVP
- CaseLines API direct submission (pleadings generated but uploaded manually).
- Direct client-side Supabase queries (fully blocked; all queries must go through Server Actions).
- Full trust account bank reconciliation.
- Legal research integrations (Practical Law / Juta / LexisNexis search).

---

## 3. Critical Blockers & Tenancy Gaps

### 🚨 1. Cross-Firm Client/Matter Linkage Vulnerabilities
Several Server Actions accept foreign resource identifiers from client-side parameters and insert them directly without verifying that they belong to the practitioner's firm. Since actions use `createAdminClient()`, RLS is bypassed.
- **Matters Action (`createMatter`)**: Does not verify if the `client_id` belongs to the user's `firm_id`. A user from Firm A could link a new matter to a client belonging to Firm B.
- **Time Entries Action (`recordTimeEntry`)**: Does not verify if the `matter_id` belongs to the user's `firm_id`. A user from Firm A could record billable time against a matter belonging to Firm B.
- **Timeline Action (`addTimelineEvent`)**: Does not verify if the `matterId` belongs to the user's `firm_id`.
- **Deadline Action (`createCourtDeadline`)**: Does not verify if the `matterId` belongs to the user's `firm_id`.

### 🚨 2. Unenforced Luhn SA ID Validation
`SaIdSchema` (Luhn verification algorithm) is defined in [schemas/index.ts](file:///c:/Users/SSTECH/developments/legal-matters/app/src/schemas/index.ts) but is not imported or wired into `CreateClientSchema`. Clients can currently register with invalid SA ID numbers.

---

## 4. Recommended Implementation Order

1. **Phase 1: Foundation Security Fixes (P0_BLOCKER)**:
   - Add firm-ownership verification queries inside `createMatter`, `recordTimeEntry`, `addTimelineEvent`, and `createCourtDeadline`.
   - Wire `SaIdSchema` and `SaCompanyRegSchema` into `CreateClientSchema`.
2. **Phase 2: User Admin UI (P2_IMPORTANT)**:
   - Create a dashboard UI for firm partners to invite staff and edit roles.
3. **Phase 3: FICA Checklist (P2_IMPORTANT)**:
   - Add a simple FICA status schema and dashboard UI component for client profiles.
4. **Phase 4: Billing & Expenses Completeness (P3_IMPROVEMENT)**:
   - Implement basic expense tracking and payment recordings.
5. **Phase 5: High Court Recess factoring (P3_IMPROVEMENT)**:
   - Factoring recess calculations into the Court Days engine.
