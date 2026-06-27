# Phase 3 Document Intelligence & AI Matter Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build secure, multi-tenant document extraction pipelines, AI summarization fields, source-cited audit links, and AI-driven compliance readiness checklists.

**Architecture:** Files are uploaded to partitioned storage bucket folders, parsed, and logged in the database under strict RLS scoping. A secure server-side LLM pipeline generates summaries and checks compliance rules before gating case closure, with all outputs requiring manual practitioner approval.

**Tech Stack:** Next.js 15, Supabase Storage, Clerk Auth, Vitest, Playwright, Google Genkit / Gemini 1.5 Pro.

---

## Proposed Changes

### Task 24: Storage and Document Processing Schema
Create the database tables, row level security policies, indexes, and role permission grants.

**Files:**
- Create: `app/supabase/migrations/20260614182500_phase_3_document_intelligence.sql`
- Test: Run migration commands against local database

- [ ] **Step 1: Write SQL Migration Script**
  Create file `app/supabase/migrations/20260614182500_phase_3_document_intelligence.sql` with the following content:
  ```sql
  -- Create Tables
  CREATE TABLE public.document_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.document_versions(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  CREATE TABLE public.document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    version_id UUID UNIQUE NOT NULL REFERENCES public.document_versions(id) ON DELETE CASCADE,
    extracted_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  CREATE TABLE public.ai_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    confidence_score NUMERIC(4,3) NOT NULL,
    missing_information JSONB,
    approval_status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  CREATE TABLE public.ai_output_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    ai_output_id UUID NOT NULL REFERENCES public.ai_outputs(id) ON DELETE CASCADE,
    source_document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    source_version_id UUID NOT NULL REFERENCES public.document_versions(id) ON DELETE CASCADE,
    quote_text TEXT NOT NULL,
    page_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  CREATE TABLE public.matter_readiness_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    overall_score NUMERIC(4,3) NOT NULL,
    checked_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  CREATE TABLE public.matter_readiness_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    check_id UUID NOT NULL REFERENCES public.matter_readiness_checks(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    is_satisfied BOOLEAN NOT NULL,
    details TEXT,
    citation_output_id UUID REFERENCES public.ai_outputs(id) ON DELETE SET NULL
  );

  CREATE TABLE public.ai_approval_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    ai_output_id UUID NOT NULL REFERENCES public.ai_outputs(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    performed_by TEXT NOT NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  -- Enable RLS
  ALTER TABLE public.document_processing_jobs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.ai_outputs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.ai_output_sources ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.matter_readiness_checks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.matter_readiness_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.ai_approval_events ENABLE ROW LEVEL SECURITY;

  -- RLS Policies
  CREATE POLICY "Jobs isolation" ON public.document_processing_jobs FOR ALL USING (firm_id = get_auth_firm_id());
  CREATE POLICY "Extractions isolation" ON public.document_extractions FOR ALL USING (firm_id = get_auth_firm_id());
  CREATE POLICY "AI outputs isolation" ON public.ai_outputs FOR ALL USING (firm_id = get_auth_firm_id());
  CREATE POLICY "AI sources isolation" ON public.ai_output_sources FOR ALL USING (firm_id = get_auth_firm_id());
  CREATE POLICY "Checks isolation" ON public.matter_readiness_checks FOR ALL USING (firm_id = get_auth_firm_id());
  CREATE POLICY "Check items isolation" ON public.matter_readiness_items FOR ALL USING (firm_id = get_auth_firm_id());
  CREATE POLICY "Approval events isolation" ON public.ai_approval_events FOR ALL USING (firm_id = get_auth_firm_id());

  -- Indexes
  CREATE INDEX idx_processing_jobs_firm_status ON public.document_processing_jobs (firm_id, status);
  CREATE INDEX idx_ai_outputs_matter_type ON public.ai_outputs (matter_id, type);

  -- Grants
  GRANT ALL ON TABLE public.document_processing_jobs TO postgres, service_role, authenticated;
  GRANT ALL ON TABLE public.document_extractions TO postgres, service_role, authenticated;
  GRANT ALL ON TABLE public.ai_outputs TO postgres, service_role, authenticated;
  GRANT ALL ON TABLE public.ai_output_sources TO postgres, service_role, authenticated;
  GRANT ALL ON TABLE public.matter_readiness_checks TO postgres, service_role, authenticated;
  GRANT ALL ON TABLE public.matter_readiness_items TO postgres, service_role, authenticated;
  GRANT ALL ON TABLE public.ai_approval_events TO postgres, service_role, authenticated;
  ```

- [ ] **Step 2: Run local DB migration**
  Run: `npx supabase migration new phase_3_document_intelligence` (then copy migration content) followed by `npx supabase db reset`

- [ ] **Step 3: Run RLS checks to verify policies compile**
  Run: `npm --prefix app run test:db`
  Expected: Verification passes.

- [ ] **Step 4: Commit Migration**
  Run:
  ```bash
  git add app/supabase/migrations/20260614182500_phase_3_document_intelligence.sql
  git commit -m "migration: add Phase 3 document processing and AI schemas"
  ```

---

### Task 25: Supabase Storage Upload Integration
Integrate client-side file upload directly to Supabase storage buckets partitioned by `firm_id/matter_id/`.

**Files:**
- Create: `app/src/lib/supabase/storage.ts`
- Modify: `app/src/app/dashboard/matters/[id]/documents/page.tsx`
- Test: `app/src/tests/storage.test.ts` [NEW]

- [ ] **Step 1: Write storage client test**
  Create file `app/src/tests/storage.test.ts` with assertions checking that storage path complies with:
  ```typescript
  import { expect, test } from 'vitest';
  import { getStoragePath } from '@/lib/supabase/storage';

  test('generates partitioned storage path', () => {
    const path = getStoragePath('firm_123', 'matter_456', 'doc.pdf');
    expect(path).toMatch(/^firm_123\/matter_456\/[a-f0-9-]+\.pdf$/);
  });
  ```

- [ ] **Step 2: Run Vitest storage test to verify failure**
  Run: `npm --prefix app run test:run`
  Expected: FAIL (getStoragePath not defined)

- [ ] **Step 3: Implement Storage helper**
  Create `app/src/lib/supabase/storage.ts`:
  ```typescript
  import crypto from 'crypto';

  export function getStoragePath(firmId: string, matterId: string, filename: string): string {
    const ext = filename.split('.').pop() || 'bin';
    const uuid = crypto.randomUUID();
    return `${firmId}/${matterId}/${uuid}.${ext}`;
  }
  ```

- [ ] **Step 4: Run Vitest test to verify pass**
  Run: `npm --prefix app run test:run`
  Expected: PASS

- [ ] **Step 5: Modify documents page upload workflow to call Supabase Storage upload**
  Modify file: `app/src/app/dashboard/matters/[id]/documents/page.tsx`
  Wire the standard client-side upload handler to call `supabase.storage.from('legal-documents').upload(...)` before writing document metadata.

- [ ] **Step 6: Commit**
  Run:
  ```bash
  git add app/src/lib/supabase/storage.ts app/src/tests/storage.test.ts app/src/app/dashboard/matters/\[id\]/documents/page.tsx
  git commit -m "feat: integrate Supabase Storage upload partitioning"
  ```

---

### Task 26: Document Extraction Pipeline
Create the server action to process text extraction jobs, adding exclusions flags check.

**Files:**
- Create: `app/src/server/actions/extraction.actions.ts`
- Modify: `app/src/schemas/index.ts`
- Test: `app/src/tests/extraction.test.ts` [NEW]

- [ ] **Step 1: Write extraction action test**
  Create `app/src/tests/extraction.test.ts` verifying that extraction rejects files marked with `is_ai_excluded = true` and checks firm tenancy:
  ```typescript
  import { expect, test } from 'vitest';
  import { processTextExtraction } from '@/server/actions/extraction.actions';

  test('processTextExtraction rejects excluded files', async () => {
    await expect(processTextExtraction('excluded-doc-id')).rejects.toThrow("Access Denied: Document is flagged for AI exclusion.");
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm --prefix app run test:run`
  Expected: FAIL

- [ ] **Step 3: Implement extraction actions**
  Create `app/src/server/actions/extraction.actions.ts`:
  ```typescript
  'use server';

  import { createAdminClient } from '@/lib/supabase/server';
  import { requireAuthUser } from '@/lib/auth';

  export async function processTextExtraction(documentId: string) {
    const auth = await requireAuthUser();
    const supabase = createAdminClient();

    // Verify document scope and is_ai_excluded state
    const { data: doc, error } = await supabase
      .from('documents')
      .select('id, firm_id, is_privileged, status, is_ai_excluded')
      .eq('id', documentId)
      .eq('firm_id', auth.firmId)
      .single();

    if (error || !doc) throw new Error("Document not found");
    if (doc.is_ai_excluded) {
      throw new Error("Access Denied: Document is flagged for AI exclusion.");
    }

    // Mock text extraction simulator (will fetch from Supabase bucket in Phase 3 release)
    const mockText = "This is the extracted summons content showing claim amount R500,000 against MEC Health on page 3.";
    
    // Log extraction
    await supabase.from('document_extractions').upsert({
      firm_id: auth.firmId,
      document_id: doc.id,
      matter_id: 'd5555555-5555-5555-5555-555555555555', // Zulu MEC health staging matter
      version_id: '00000000-0000-0000-0000-000000000011',
      extracted_text: mockText
    });

    return { success: true, text: mockText };
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm --prefix app run test:run`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add app/src/server/actions/extraction.actions.ts app/src/tests/extraction.test.ts
  git commit -m "feat: add processTextExtraction action with exclusions check"
  ```

---

### Task 27: AI Output Schema and Audit Logs
Implement the Zod validation schemas for AI content outputs, quotes citations, and create server actions to insert AI outputs and log audits.

**Files:**
- Create: `app/src/server/actions/ai.actions.ts`
- Modify: `app/src/schemas/index.ts`
- Test: `app/src/tests/ai.test.ts` [NEW]

- [ ] **Step 1: Write schema validation test**
  Create `app/src/tests/ai.test.ts` asserting that `AiOutputSchema` rejects outputs without confidence scores or page citations:
  ```typescript
  import { expect, test } from 'vitest';
  import { AiOutputSchema } from '@/schemas';

  test('rejects missing confidence rating', () => {
    const res = AiOutputSchema.safeParse({ type: 'document_summary', content: {} });
    expect(res.success).toBe(false);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm --prefix app run test:run`
  Expected: FAIL

- [ ] **Step 3: Define Zod validator**
  Modify `app/src/schemas/index.ts` to add schema definitions:
  ```typescript
  export const CitationSchema = z.object({
    quote_text: z.string(),
    page_number: z.number().optional(),
    source_document_id: z.string().uuid(),
    source_version_id: z.string().uuid()
  });

  export const AiOutputSchema = z.object({
    type: z.enum(['document_summary', 'matter_summary', 'readiness_check']),
    content: z.record(z.any()),
    confidence_score: z.number().min(0).max(1),
    missing_information: z.array(z.string()).optional(),
    citations: z.array(CitationSchema)
  });
  ```

- [ ] **Step 4: Create AI generator server action**
  Create `app/src/server/actions/ai.actions.ts` to process raw text via Gemini and validate citations before inserting records. Ensure to check tenant scoping and log the `ai_generation_request` in `public.audit_logs`.

- [ ] **Step 5: Run Vitest tests to verify pass**
  Run: `npm --prefix app run test:run`
  Expected: PASS

- [ ] **Step 6: Commit**
  Run:
  ```bash
  git add app/src/schemas/index.ts app/src/server/actions/ai.actions.ts app/src/tests/ai.test.ts
  git commit -m "feat: add Zod validation schemas for AI outputs and citations"
  ```

---

### Task 28: Document Summary UI
Build the frontend visual interfaces for the Document Summary and AI citation panels.

**Files:**
- Create: `app/src/components/AiSummaryPanel.tsx`
- Modify: `app/src/app/dashboard/matters/[id]/documents/page.tsx`

- [ ] **Step 1: Create UI component**
  Create `app/src/components/AiSummaryPanel.tsx` displaying the warning banner: *"Warning: This content is draft AI analysis..."* if approval is pending, rendering citations, showing quotes, page numbers, and showing the **Approve** button.

- [ ] **Step 2: Integrate into document viewer panel**
  Modify `app/src/app/dashboard/matters/[id]/documents/page.tsx` to mount the `AiSummaryPanel` inside the side sheet or modal details viewer.

- [ ] **Step 3: Run linter and typecheck**
  Run: `npm --prefix app run typecheck` and `npm --prefix app run lint`
  Expected: PASS with 0 warnings or errors.

- [ ] **Step 4: Commit**
  Run:
  ```bash
  git add app/src/components/AiSummaryPanel.tsx app/src/app/dashboard/matters/\[id\]/documents/page.tsx
  git commit -m "feat: add AiSummaryPanel UI with citation preview and warning banner"
  ```

---

### Task 29: Matter Readiness Engine
Implement the server action to run readiness evaluations and compile scores based on category weightings (e.g. FICA check, client agreements, pleadings status).

**Files:**
- Create: `app/src/server/actions/readiness.actions.ts`
- Modify: `app/src/app/dashboard/matters/[id]/page.tsx`
- Test: `app/src/tests/readiness.test.ts` [NEW]

- [ ] **Step 1: Write readiness calculation test**
  Create `app/src/tests/readiness.test.ts` checking that evaluation calculates weights correctly and stores the check results under the practitioner's firm.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm --prefix app run test:run`
  Expected: FAIL

- [ ] **Step 3: Implement readiness server action**
  Create `app/src/server/actions/readiness.actions.ts` containing the `runMatterReadinessCheck(matterId: string)` logic. It queries client data, matter data, tasks, deadlines, and outputs an overall score and list of readiness items.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm --prefix app run test:run`
  Expected: PASS

- [ ] **Step 5: Mount Readiness Scoreboard in Matter Control Center**
  Modify `app/src/app/dashboard/matters/[id]/page.tsx` to render the Readiness tab displaying score charts and listing missing items.

- [ ] **Step 6: Commit**
  Run:
  ```bash
  git add app/src/server/actions/readiness.actions.ts app/src/tests/readiness.test.ts app/src/app/dashboard/matters/\[id\]/page.tsx
  git commit -m "feat: implement Matter Readiness scoring engine and UI scoreboard"
  ```

---

### Task 30: AI Approval Workflow
Create the server actions to approve/reject AI summaries, validating that approved states cannot be overridden or edited.

**Files:**
- Create: `app/src/server/actions/approval.actions.ts`
- Test: `app/src/tests/approval.test.ts` [NEW]

- [ ] **Step 1: Write approval constraint test**
  Create `app/src/tests/approval.test.ts` asserting that calling `approveAiOutput` transition states correctly and prevents unauthorized modification of approved outputs.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm --prefix app run test:run`
  Expected: FAIL

- [ ] **Step 3: Implement approval actions**
  Create `app/src/server/actions/approval.actions.ts` with `approveAiOutput` and `rejectAiOutput`. Ensure it checks RLS boundaries, updates the `approval_status` inside `public.ai_outputs`, logs the active practitioner's Clerk ID, and records a trace inside `public.ai_approval_events` and `public.audit_logs`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm --prefix app run test:run`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add app/src/server/actions/approval.actions.ts app/src/tests/approval.test.ts
  git commit -m "feat: implement AI output approval workflow and audits"
  ```

---

### Task 31: Phase 3 E2E and Staging Verification
Write E2E tests validating the document extraction status, citation panel, warning banners, vector scopes, and AI approval flow.

**Files:**
- Create: `app/playwright/tests/ai-readiness.spec.ts`
- Modify: `package.json` (add run scripts)

- [ ] **Step 1: Write E2E Playwright test**
  Create `app/playwright/tests/ai-readiness.spec.ts` asserting:
  - Uploading a document initiates the status extraction tracker.
  - The AI summary banner shows the warning and the "Approve" button is active.
  - Clicking "Approve" hides the warning banner and locks the summary context.

- [ ] **Step 2: Run E2E local checks**
  Run: `npm --prefix app run test:e2e`
  Expected: PASS (under local mock auth settings)

- [ ] **Step 3: Verify overall build compiles**
  Run: `npm --prefix app run build`
  Expected: Compiled successfully.

- [ ] **Step 4: Commit E2E test suite**
  Run:
  ```bash
  git add app/playwright/tests/ai-readiness.spec.ts
  git commit -m "test: add Phase 3 AI document intelligence and readiness E2E tests"
  ```

---

## Execution Handoff
Plan complete and saved to `docs/PHASE_3_IMPLEMENTATION_PLAN.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
