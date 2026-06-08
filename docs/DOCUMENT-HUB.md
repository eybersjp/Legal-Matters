# Secure Document Hub Foundation

This document outlines the technical architecture, security enforcement, storage design, server action workflows, and audit logging for the **Secure Document Hub** module of the **Legal Matters** platform.

---

## 🎯 1. Overview
The Secure Document Hub delivers a secure, multi-tenant, matter-linked document registry. It implements strict POPIA-compliant access controls, document versioning, automated AI summary placeholders, and unalterable audit trails. 

In line with the platform's security discipline, **all client-side direct Supabase queries or mutations are strictly blocked**. All operations execute server-side through Next.js Server Actions or server-only API routes.

---

## 💾 2. Database Schema Extensions

### 2.1 Extended `documents` Table
The existing `documents` table has been extended with the following columns to support classification, confidentiality, and approval status:
- `status`: `VARCHAR(50)` (Values: `uploaded`, `classified`, `review_pending`, `approved`, `rejected`, `archived`)
- `confidentiality_level`: `VARCHAR(50)` (Values: `standard`, `confidential`, `restricted`)
- `category`: `VARCHAR(100)` (Stores doc classification: `Pleading`, `Evidence`, `Correspondence`, `Internal Memo`, `Precedent`)
- `document_type`: `VARCHAR(100)` (Stores file MIME type)
- `ai_processed`: `BOOLEAN` (Indicates if the document has been summarized by the AI pipeline)
- `approval_status`: `VARCHAR(50)` (Values: `pending`, `approved`, `rejected`)
- `client_id`: `UUID` (Links to `clients.id` for client scoping)
- `parent_document_id`: `UUID` (Self-reference for versioning or document relationships)

### 2.2 Table: `document_ai_summaries`
Stores AI-generated document summaries and validation metrics.
```sql
CREATE TABLE document_ai_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    output_title TEXT NOT NULL,
    summary_text TEXT NOT NULL,
    sources_used JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence_level TEXT NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),
    missing_information TEXT,
    suggested_next_action TEXT,
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    generated_by TEXT REFERENCES firm_members(id) ON DELETE SET NULL,
    approved_by TEXT REFERENCES firm_members(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### 2.3 Table: `document_source_references`
Stores exact citations mapping AI summary assertions back to source files/pages.
```sql
CREATE TABLE document_source_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    summary_id UUID REFERENCES document_ai_summaries(id) ON DELETE CASCADE,
    source_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    source_type TEXT,
    page_number INTEGER,
    field_name TEXT,
    citation_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

---

## 🪣 3. Storage Architecture

### 3.1 Bucket Configuration
- **Bucket ID/Name**: `legal-matters-docs`
- **Public access**: `false` (Private storage bucket)
- **Key Access**: Operations are performed using the server-side admin client with service role credentials.

### 3.2 Storage Path Convention
Storage paths are generated **strictly server-side** to avoid path-traversal attacks and filename conflicts. Original filenames provided by the client are **never** trusted for the storage path.
- **Convention**: `${firm_id}/${matter_id}/${uuid}${extension}`
- **Example**: `daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/mock-matter-litigation-1/8d6f54c9-bc12-4f3d-815d-8b01c38fa220.pdf`
- The original filename is preserved purely in `document_versions.file_name` metadata.

---

## 🔒 4. Server Actions and Security Controls

All actions reside in `src/server/actions/document.actions.ts`.

### 4.1 Auth & Tenant Scoping
Every exported action executes:
1. `requireAuthUser()` to retrieve and verify the Clerk-authenticated user and the corresponding `firm_id`.
2. `createAdminClient()` to query/mutate database resources. All SQL joins and tables are scoped using the `firm_id` retrieved from Clerk.

### 4.2 Matter Ownership Verification
Before uploading any document, the action queries the `matters` table using the requested `matter_id` and the authenticated user's `firm_id`.
```ts
const { data: matter } = await adminDb
  .from('matters')
  .select('id, firm_id, client_id')
  .eq('id', matterId)
  .eq('firm_id', auth.firmId)
  .single();
```
If no record is returned, the upload fails with `Access denied` before storage blocks are processed.

### 4.3 Validation Rules
- **Allowed MIME types**:
  - `application/pdf` (.pdf)
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
  - `image/png` (.png)
  - `image/jpeg` (.jpg)
  - `text/plain` (.txt)
- **Maximum File Size**: 5 MB (Strictly validated in the action)

---

## ✍️ 5. Audit Logging and Matter Timeline

Every state change or file interaction writes a permanent audit trail.

### 5.1 Audit Logs (`audit_logs`)
- **Action**: `UPLOAD_DOCUMENT`, `UPLOAD_NEW_VERSION`, `ARCHIVE_DOCUMENT`, `GENERATE_AI_SUMMARY_PLACEHOLDER`, `APPROVE_AI_SUMMARY`, `REJECT_AI_SUMMARY`, `DOWNLOAD`
- **Scoping**: Written with the user's `firm_id` and the target document UUID as `resource_id`.

### 5.2 Matter Timeline Events (`matter_events`)
- Critical events are posted to the matter timeline so practitioners can track case progression:
  - **Upload**: `Document Uploaded: "particulars.pdf"`
  - **New Version**: `New Document Version Uploaded: Version 2`
  - **AI Summary**: `AI Summary Generated (Placeholder) for "intake.pdf"`
  - **Status change**: `AI Summary Approved/Rejected`
  - **Archived**: `Document Archived`

---

## 🤖 6. AI Summary Placeholders

Live AI integrations are deferred. The system generates a deterministic placeholder model for workflow validation:
- **Title**: `Placeholder Document Summary`
- **Text**: `This is a placeholder document summary generated for workflow validation. Live AI extraction is not enabled yet.`
- **Confidence**: `low`
- **Missing Information**: `Live document extraction is not yet enabled. Review the document manually before relying on this summary.`
- **Suggested Next Action**: `Review document manually and approve metadata classification.`
- **Approval status**: `pending` (allows practitioner review, approve/reject workflow testing).
- **Sources Used**: Contains structured information identifying the source file ID, name, and timestamp.

---

## 🧪 7. Test Coverage

- **Unit tests (`src/tests/document-hub.test.ts`)**:
  - Validates allowed and rejected MIME types.
  - Verifies 5MB size restriction.
  - Confirms storage path is generated without the original filename.
  - Asserts that cross-firm upload attempts are correctly blocked.
  - Validates the AI summary and source reference structure.
  - Tests the approve/reject state transitions.
- **E2E tests (`playwright/tests/app.spec.ts`)**:
  - Test 12 logs in, opens the matter Document Hub tab, loads mock data, inspects the details drawer, approves the placeholder summary, and checks that the success alert appears.

---

## 🛑 8. Production Gaps and Blockers
1. **Live AI Pipeline**: Live OCR / text extraction and LLM summarization are disabled. Production release requires secure processing queues.
2. **Supabase Storage Policies**: Supabase Storage row-level policies must be configured to match our custom Clerk `get_auth_firm_id()` RLS rules before direct client access could be considered, though server-side admin client access remains the preferred pattern.
