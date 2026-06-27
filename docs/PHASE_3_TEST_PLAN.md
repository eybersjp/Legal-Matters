# Phase 3 Verification & Testing Plan

This document details the verification and testing strategies to ensure the security, multi-tenant isolation, and data-integrity bounds of the Document Intelligence and AI Matter Readiness features.

---

## 1. Test Architecture Overview

Verification follows a multi-layer strategy:
```
  [Playwright E2E]      --> User interfaces, approval flows, status indicators
        |
  [Vitest Integration]  --> Server Action gates, text processing, schema outputs
        |
  [Vitest Unit]         --> Citation matching, readiness score algorithms
        |
  [Supabase RLS]        --> Multi-tenant isolation at database level
```

---

## 2. Row Level Security (RLS) Policy Tests

We will write automated SQL script assertions in `app/scripts/run-rls-tests.js` (or a dedicated Phase 3 script) to verify:
- **Tenant Isolation**: A practitioner from Firm A cannot query summaries, jobs, extractions, or approval events belonging to Firm B.
- **Insert Prevention**: A practitioner from Firm A cannot insert an AI output citation referencing a document or matter owned by Firm B.
- **Helper Functions Security**: Ensure checking function permissions blocks non-authenticated database roles.

---

## 3. Unit & Integration Tests (Vitest)

All tests will be placed in `app/src/tests/` to run sequentially with Vitest.

### 3.1 AI Output Schema Tests
- **Path**: `app/src/tests/ai-schema.test.ts`
- **Goal**: Verify structured JSON parser rejects malformed inputs and satisfies the Zod validator.
- **Key Assertions**:
  - Assert Zod schema rejects responses without confidence values or type properties.
  - Verify citation arrays contain required source page and document IDs.

### 3.2 Citation Provenance Matching Tests
- **Path**: `app/src/tests/provenance.test.ts`
- **Goal**: Assert citation string validation logic works.
- **Key Assertions**:
  - Assert validation succeeds if the quote exists inside the source document text.
  - Assert validation fails if the quote text is fabricated or mismatched.

### 3.3 Excluded Document Gating Tests
- **Path**: `app/src/tests/exclusions.test.ts`
- **Goal**: Verify that documents marked with `is_ai_excluded = true` are blocked from being sent to the LLM processor.
- **Key Assertions**:
  - Call the extraction action with an excluded document ID and assert it throws a custom exception: `"Access Denied: Document is flagged for AI exclusion."`

### 3.4 Approval Workflow Tests
- **Path**: `app/src/tests/approval-actions.test.ts`
- **Goal**: Verify the transitions of `approval_status` (`pending` -> `approved` or `rejected`).
- **Key Assertions**:
  - Verify `approveAiOutput` successfully updates state and logs the Clerk ID.
  - Verify editing an approved output throws a validation blocker (approved fields are locked).

---

## 4. Playwright End-to-End (E2E) Test Plan

We will expand `app/playwright/tests/app.spec.ts` (or add `ai-readiness.spec.ts`) to cover:

### 4.1 Document Ingestion Flow
1. Log in as test practitioner.
2. Open the Matter Control Center -> Document Hub tab.
3. Upload a litigation document.
4. Verify the **Processing Status Indicator** displays `'processing'` then changes to `'completed'`.

### 4.2 Document Summary & Citation Panel
1. Open the uploaded document details.
2. Verify the **AI Summary Box** displays with the warning banner: *"Warning: This content is draft AI analysis..."*.
3. Click on a citation badge; verify the **AI Source Viewer** highlights the cited quote and displays page numbers.
4. Click **Approve**. Verify the warning banner disappears.

### 4.3 Matter Readiness Scoreboard
1. Navigate to the **Close Matter** tab.
2. Verify the **Readiness Score telemetry** displays the current score.
3. Verify the **Missing Info checklist** details missing elements (e.g. *"Missing FICA Identification"*).
4. Settle the outstanding client items and verify the checklist updates dynamically.
