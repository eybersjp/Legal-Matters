# Known Limitations — Phase 3 Release Candidate

This document outlines the known limitations, mock integrations, and boundaries of the **Legal Matters** Phase 3 Release Candidate. These limitations are intentionally documented to guide stakeholders and outline requirements for the subsequent development phases.

---

## Phase 3: Document Intelligence & AI Matter Readiness

### 7. AI Text Extraction Pipeline
- **Extraction Status**: The document text extraction pipeline is fully implemented with job lifecycle tracking, firm-scoped isolation, and AI exclusion flag support.
- **Limitation**: Text extraction is simulated (uses placeholder text). The system does not call a live Gemini API, Google Document AI, or OCR engine to read document binaries in real time.
- **Future Resolution**: Integrate live Gemini 1.5 Pro / Genkit extraction with background job queue processing.

### 8. AI Summarization & LLM Integration
- **Summary Status**: AI output schemas, citation structures, and approval workflows are fully implemented with Zod validation and audit logging.
- **Limitation**: AI summaries are generated from template-based mock pipelines. No live LLM integration (Gemini, OpenAI, or equivalent) is connected for generating real document summaries, matter briefs, or readiness insights.
- **Future Resolution**: Connect a production LLM API (Gemini 1.5 Pro recommended) with structured prompt templates, streaming responses, and token usage tracking.

### 9. Vector Embeddings & Semantic Search
- **Citation Status**: Source citations are stored with document IDs, version IDs, quote text, and page numbers. The citation panel renders provenance links.
- **Limitation**: No vector embeddings or semantic similarity search is implemented. Document matching uses exact text comparison only. There is no pgvector-based retrieval for finding related documents or citations.
- **Future Resolution**: Implement pgvector embeddings for document chunks and semantic citation matching.

### 10. Matter Readiness Engine
- **Readiness Status**: The readiness scoring engine evaluates 8 weighted categories and stores results in `matter_readiness_checks` and `matter_readiness_items`.
- **Limitation**: Category weightings are hardcoded. Firms cannot customize their own readiness profiles, add custom categories, or adjust weights based on practice area (litigation vs. conveyancing vs. corporate).
- **Future Resolution**: Build a firm-configurable readiness profile system with practice-area templates.

### 11. AI Approval Workflow
- **Approval Status**: Full pending/approve/reject workflow with state locking, audit trail logging, and practitioner Clerk ID tracking.
- **Limitation**: The approval workflow supports single-practitioner approval only. There is no multi-partner sign-off, no escalation chain, and no appeal/resubmission process for rejected outputs.
- **Future Resolution**: Implement multi-partner approval chains, configurable escalation rules, and resubmission workflows.

### 12. Document Processing at Scale
- **Processing Status**: Document extraction runs synchronously with firm-scoped isolation and job status tracking.
- **Limitation**: No batch processing for large document sets. No background job queue (Inngest, BullMQ, or similar) for async extraction. Processing is one-at-a-time and blocks the server action.
- **Future Resolution**: Implement a background job queue for parallel document extraction with retry logic and progress tracking.

---

## Phase 1 & 2: Core Platform Limitations (Previously Documented)

---

### 1. Document Hub & AI Text Extraction (Legacy)
- **AI Processing Status**: The document text extraction pipeline is implemented but currently uses simulated outputs. The system processes queued jobs, updates job lifecycles, and creates extraction rows.
- **Limitation**: Text extraction is simulated (labeled as draft placeholders, e.g. `Placeholder extraction for <filename>`). The system does not call a live Gemini API or OCR engine to read document binaries in real time.
- **Future Resolution**: Integrate live Gemini/Genkit extraction in subsequent tasks.

## 2. File Upload & Binary Storage
- **Storage Status**: Fully implemented. Files are uploaded securely to the private `'legal-matters-docs'` Supabase Storage bucket. Access is restricted using custom RLS path validation policies (`firm_id` segment matches the authenticated user's firm context).


### 3. South African Court Days Calculations & Public Holidays
- **Calculation Status**: The deadline calculator accurately excludes Saturdays, Sundays, and standard static public holidays.
- **Limitation**: The calendar calculations rely on a static array of South African public holidays. The engine is not connected to a live calendar API (e.g., Google Calendar public holidays feed or government gazette service), which might fail to capture dynamically declared holidays.
- **Future Resolution**: Integrate a live public holidays API client with caching.

### 4. Billing, Invoices, and EFT Reconciliations
- **Ledger Status**: Fully supports logging time entries, disbursements (expenses), issuing invoices, and recording EFT payment logs with automated status transitions (`Issued` to `Paid`).
- **Limitation**: Bank statement reconciliation is fully manual. Practitioners must type in transaction references and payment amounts. There is no automated bank feed integration (e.g., Stitch or Nedbank API) or payment gateway integration (e.g., PayFast or Yoco).
- **Future Resolution**: Set up automated webhook statement scanning or a PayFast checkout drawer for clients to settle invoices.

### 5. Automated Case Numbering
- **Numbering Status**: Practitioners must manually input the case number (e.g., `2026/45678`) when creating matters.
- **Limitation**: The system does not automatically generate internal practice file numbers (e.g. `ZUL/2026/0001` based on client prefix, year, and sequence).
- **Future Resolution**: Implement an automated file number generator schema customizable by each firm.

### 6. Email and SMS Notifications
- **Alert Status**: System notifications (such as Partner-level deadline escalations) are logged inside the database `notifications` table and rendered in the user notification panel.
- **Limitation**: No external delivery channels are configured. The system does not dispatch real emails (via Resend or SendGrid) or SMS messages (via Twilio or BulkSMS).
- **Future Resolution**: Set up Resend transactional email templates for alerts and client communication summaries.
