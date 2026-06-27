# Next Phase Recommendations — Phase 4 Technical Roadmap

This document outlines the recommended technical roadmap and architectural directions for **Phase 4** of the **Legal Matters** practice management platform, building directly on the stable Phase 3 Release Candidate.

> **Phase 3 Completed**: Document Intelligence, AI Matter Readiness, source-cited AI outputs, readiness scoring, and approval workflows are fully implemented and verified (162/162 tests passing).

---

## Priority 1 — Production Hardening

### 1. Live LLM Integration (Gemini 1.5 Pro)
- **Objective**: Replace mock AI summaries with real LLM-generated document analysis, matter briefs, and readiness insights.
- **Current State**: AI output schemas, citation structures, and approval workflows are fully implemented. Summaries use template-based mock pipelines.
- **Recommendations**:
  - Connect **Google Genkit** with **Gemini 1.5 Pro/Flash** for structured document summarization.
  - Implement schema-guided extraction using structured JSON outputs to resolve client details, case numbers, and litigation events.
  - Enforce multi-tenant prompt boundaries: every LLM call must include strict `firm_id` and `matter_id` context headers.
  - Stream responses for large documents to avoid timeout issues.
  - Log token usage, model ID, and execution time to `audit_logs` for every generation request.

### 2. Background Job Queue (Inngest or BullMQ)
- **Objective**: Move document extraction from synchronous server actions to async background processing.
- **Current State**: Extraction runs synchronously and blocks the server action. No batch processing for large document sets.
- **Recommendations**:
  - Implement **Inngest** (serverless) or **BullMQ** (Redis-backed) for async document extraction pipelines.
  - Support batch processing for bulk document uploads (e.g., entire case file ingestion).
  - Add retry logic with exponential backoff for failed extractions.
  - Expose job status via the existing `document_processing_jobs` table for real-time progress tracking in the UI.

### 3. Vector Embeddings & Semantic Search (pgvector)
- **Objective**: Enable document similarity search, semantic citation matching, and related document recommendations.
- **Current State**: Citations use exact text matching only. No vector-based retrieval is implemented.
- **Recommendations**:
  - Enable **pgvector** extension on the Supabase database.
  - Generate embeddings for document chunks using Gemini's embedding API or OpenAI text-embedding-3-small.
  - Store embeddings in a new `document_embeddings` table with HNSW index for fast similarity search.
  - Build a semantic search endpoint that returns ranked document matches for a given query or citation.

---

## Priority 2 — Feature Expansion

### 4. Multi-Partner Approval Workflows
- **Objective**: Support multi-partner sign-off for high-stakes AI outputs and matter closure.
- **Current State**: Single-practitioner approval only. No escalation chain or appeal process.
- **Recommendations**:
  - Extend `ai_outputs` with a `required_approvers` count field for configurable approval thresholds.
  - Implement approval chain logic: output transitions to `approved` only after N practitioners approve.
  - Add resubmission workflow for rejected outputs (practitioner can edit and resubmit for review).
  - Log full approval chain in `ai_approval_events` with timestamps and practitioner IDs.

### 5. Custom Matter Readiness Profiles
- **Objective**: Allow firms to configure their own readiness categories, weights, and scoring rules.
- **Current State**: 8 hardcoded categories with fixed weightings. No firm customization.
- **Recommendations**:
  - Create a `readiness_profiles` table with configurable categories, weights, and thresholds.
  - Add a firm settings page for administrators to customize readiness profiles per practice area.
  - Support practice-area templates (Litigation, Conveyancing, Corporate, Labour) with sensible defaults.
  - Allow per-matter overrides for special-case readiness requirements.

### 6. PDF Invoice Generator
- **Objective**: Generate professional, LPC-compliant tax invoices as PDFs.
- **Recommendations**:
  - Use `react-pdf` or `puppeteer-core` on the server side to compile HTML invoices into printable PDF binaries.
  - Automatically attach the PDF to email notifications and save it under the matter's document hub.
  - Include SARS-compliant VAT calculations and sequential invoice numbering.

---

## Priority 3 — Compliance & Operations

### 7. POPIA Data Retention Scheduler
- **Objective**: Automate file deletion and data retention based on consent expiry and statutory LPC retention periods.
- **Current State**: Data retention is confirmed manually during matter closure. No automated deletion.
- **Recommendations**:
  - Build a database-driven cron scheduler (e.g., Vercel Cron or Inngest scheduled functions) for automated file deletion.
  - Track consent expiry dates in `clients` table with configurable retention periods (default: 7 years per LPC).
  - Generate deletion audit logs before removing files for compliance traceability.
  - Support right-to-erasure requests under POPIA Section 24.

### 8. External Email & SMS Notifications
- **Objective**: Dispatch escalations, alerts, and client communications via email and SMS.
- **Current State**: Notifications are logged in the database `notifications` table only. No external delivery.
- **Recommendations**:
  - Integrate **Resend** for transactional emails (matter closure confirmation, invoice delivery, deadline escalations).
  - Integrate **BulkSMS** for South African SMS alerts (urgent court deadlines, client reminders).
  - Manage user communication preferences (opt-in/opt-out) inside the `user_profiles` table to maintain POPIA compliance.
  - Implement email templates for common notifications with dynamic variable substitution.

### 9. Live Public Holidays API
- **Objective**: Replace the static public holidays list with an automated, live feed.
- **Current State**: Court-days calculator uses a static array of SA public holidays.
- **Recommendations**:
  - Connect the court-days calculation service to the Calendrific API or a public South African government holidays endpoint.
  - Implement a Redis or database caching layer with a 30-day TTL to avoid blocking requests on external API failures.
  - Support fallback to the static array if the external holiday API is unreachable.

---

## Priority 4 — Payment & Billing Automation

### 10. Automated EFT & Billing Integrations
- **Objective**: Automate invoice settlement and client trust account tracking.
- **Recommendations**:
  - **Client-Facing Payments**: Embed a PayFast checkout gateway inside the client portal, allowing clients to settle invoices via credit card or Instant EFT. Configure a webhook listener to automatically trigger the `recordPayment` action.
  - **Practitioner Bank Feeds**: Integrate Stitch API to scan practitioners' bank statements for matching transaction references (e.g., `INV-00000002`) and reconcile invoices automatically.

---

## Phase 3 Completed Items (No Longer Recommended)

The following items from the original Phase 2 roadmap were completed in Phase 3 and are no longer pending:

| Item | Status | Phase 3 Implementation |
| :--- | :--- | :--- |
| Supabase Storage Integration | ✅ Completed | Private bucket with firm-scoped RLS policies |
| AI Document Processing Schema | ✅ Completed | 7 new tables with RLS and indexes |
| AI Output Validation | ✅ Completed | Zod schemas for outputs, citations, and confidence scores |
| Matter Readiness Engine | ✅ Completed | 8-category weighted scoring engine |
| AI Approval Workflow | ✅ Completed | Pending/approve/reject with audit trail |
