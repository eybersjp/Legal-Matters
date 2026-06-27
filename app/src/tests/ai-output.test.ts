import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAiOutput,
  getMatterAiOutputs,
  getDocumentAiOutputs,
  getAiOutputWithSources,
  addAiOutputSources,
  reviewAiOutput,
  approveAiOutput,
  rejectAiOutput,
  supersedeAiOutput,
  createPlaceholderAiOutputFromExtraction
} from '../server/actions/ai-output.actions';
import { requireAuthUser } from '../lib/auth';
import { createAdminClient } from '../lib/supabase/server';

vi.mock('../lib/auth', () => ({
  requireAuthUser: vi.fn()
}));

vi.mock('../lib/supabase/server', () => ({
  createAdminClient: vi.fn()
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

// Valid UUIDs for all test fixtures (Zod enforces .uuid() on all ID fields)
const FIRM_ID    = 'aaa00000-0000-4000-8000-000000000001';
const USER_ID    = 'bbb00000-0000-4000-8000-000000000002';
const MATTER_ID  = 'ccc00000-0000-4000-8000-000000000003';
const DOC_ID     = 'ddd00000-0000-4000-8000-000000000004';
const VER_ID     = 'eee00000-0000-4000-8000-000000000005';
const EXT_ID     = 'fff00000-0000-4000-8000-000000000006';
const OUTPUT_ID  = '11100000-0000-4000-8000-000000000007';
const OUTPUT_ID2 = '22200000-0000-4000-8000-000000000008';
const CROSS_MATTER  = 'dead0000-0000-4000-8000-000000000009';
const CROSS_DOC     = 'dead0000-0000-4000-8000-00000000000a';

describe('AI Output & Citation Server Actions', () => {
  const mockAuthUser = {
    userId: USER_ID,
    firmId: FIRM_ID,
    role: 'Practitioner'
  };

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(requireAuthUser).mockResolvedValue(mockAuthUser as any);

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis()
    };

    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);
  });

  describe('createAiOutput', () => {
    it('should successfully create an AI output with valid citation references', async () => {
      const payload = {
        matter_id: MATTER_ID,
        document_id: DOC_ID,
        output_type: 'document_summary',
        title: 'sum-title',
        content: { summary: 'text' },
        confidence: 'medium',
        missing_information: [],
        suggested_next_actions: [],
        status: 'draft',
        citations: [
          {
            source_type: 'extraction',
            source_ref_id: EXT_ID,
            document_id: DOC_ID,
            document_version_id: VER_ID,
            page_number: 1,
            quote: 'cite text',
            source_label: 'lbl',
            confidence: 'medium'
          }
        ]
      };

      // Mock checks:
      // 1. matter ownership
      mockSupabase.single.mockResolvedValueOnce({ data: { id: MATTER_ID }, error: null });
      // 2. document ownership
      mockSupabase.single.mockResolvedValueOnce({ data: { id: DOC_ID }, error: null });
      // 3. cited document ownership
      mockSupabase.single.mockResolvedValueOnce({ data: { id: DOC_ID }, error: null });
      // 4. cited extraction ownership
      mockSupabase.single.mockResolvedValueOnce({ data: { id: EXT_ID }, error: null });
      // 5. insert AI Output single response
      mockSupabase.single.mockResolvedValueOnce({ data: { id: OUTPUT_ID }, error: null });

      mockSupabase.insert.mockImplementation(() => mockSupabase);

      const res = await createAiOutput(payload);
      expect(res).toBeDefined();

      // Verify citations are written
      const citeCall = mockSupabase.insert.mock.calls.find((call: any) =>
        Array.isArray(call[0]) && call[0][0].source_type === 'extraction'
      );
      expect(citeCall).toBeDefined();
    });

    it('should reject document/matter summaries without citations', async () => {
      const payload = {
        matter_id: MATTER_ID,
        document_id: DOC_ID,
        output_type: 'document_summary', // Summary type
        title: 'sum-title',
        content: { summary: 'text' },
        confidence: 'medium',
        missing_information: [],
        suggested_next_actions: [],
        status: 'draft',
        citations: [] // Empty citations
      };

      // Mock ownership checks
      mockSupabase.single.mockResolvedValueOnce({ data: { id: MATTER_ID }, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: { id: DOC_ID }, error: null });

      await expect(createAiOutput(payload)).rejects.toThrow('AI summaries require at least one source citation.');
    });

    it('should reject creation if confidence or status are invalid (Zod checks)', async () => {
      const payload = {
        matter_id: MATTER_ID,
        output_type: 'document_summary',
        title: 'sum-title',
        content: { summary: 'text' },
        confidence: 'invalid-conf', // Bad confidence
        citations: []
      };

      await expect(createAiOutput(payload)).rejects.toThrow();
    });

    it('should reject if matter is owned by another firm (cross-firm)', async () => {
      const payload = {
        matter_id: CROSS_MATTER,
        output_type: 'matter_summary',
        title: 'Foreign Summary',
        content: { summary: 'ext' },
        confidence: 'medium',
        citations: [{ source_type: 'note', quote: 'text' }]
      };

      // Matter ownership returns null (mismatch)
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });

      await expect(createAiOutput(payload)).rejects.toThrow('Access denied: Matter not found or firm mismatch.');
    });

    it('should reject if any citation document is cross-firm', async () => {
      const payload = {
        matter_id: MATTER_ID,
        output_type: 'matter_summary',
        title: 'sum-title',
        content: { summary: 'text' },
        confidence: 'medium',
        citations: [
          {
            source_type: 'document',
            document_id: CROSS_DOC
          }
        ]
      };

      // 1. matter ownership passes
      mockSupabase.single.mockResolvedValueOnce({ data: { id: MATTER_ID }, error: null });
      // 2. cited document ownership returns null (mismatch)
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Mismatched firm' } });

      await expect(createAiOutput(payload)).rejects.toThrow(`Access denied: Cited document ${CROSS_DOC} belongs to another firm.`);
    });
  });

  describe('addAiOutputSources', () => {
    it('should block adding sources to approved, rejected, or superseded outputs', async () => {
      const approvedOutput = { id: OUTPUT_ID, firm_id: FIRM_ID, status: 'approved' };
      mockSupabase.single.mockResolvedValueOnce({ data: approvedOutput, error: null });

      const newSources = [{ source_type: 'note', quote: 'additional notes' }];

      await expect(addAiOutputSources(OUTPUT_ID, newSources)).rejects.toThrow(
        'Approved, rejected, or superseded AI outputs cannot be modified.'
      );
    });

    it('should succeed for draft/reviewed AI outputs', async () => {
      const draftOutput = { id: OUTPUT_ID, firm_id: FIRM_ID, status: 'draft', matter_id: MATTER_ID };
      // 1. Load output
      mockSupabase.single.mockResolvedValueOnce({ data: draftOutput, error: null });
      // 2. Load cited doc
      mockSupabase.single.mockResolvedValueOnce({ data: { id: DOC_ID }, error: null });

      mockSupabase.insert.mockImplementation(() => mockSupabase);

      const sources = [{ source_type: 'document', document_id: DOC_ID, quote: 'cite quote' }];
      const res = await addAiOutputSources(OUTPUT_ID, sources);
      expect(res.success).toBe(true);

      const citeInsert = mockSupabase.insert.mock.calls.find((call: any) =>
        Array.isArray(call[0]) && call[0][0].ai_output_id === OUTPUT_ID
      );
      expect(citeInsert).toBeDefined();
    });
  });

  describe('reviewAiOutput', () => {
    it('should transition draft to reviewed status and create review event', async () => {
      const draftOutput = { id: OUTPUT_ID, firm_id: FIRM_ID, status: 'draft', matter_id: MATTER_ID };
      mockSupabase.single.mockResolvedValueOnce({ data: draftOutput, error: null });

      mockSupabase.update.mockImplementation(() => mockSupabase);
      mockSupabase.insert.mockImplementation(() => mockSupabase);

      const res = await reviewAiOutput(OUTPUT_ID, { reason: 'Looks complete' });
      expect(res.success).toBe(true);

      // Verify event created
      const eventInsert = mockSupabase.insert.mock.calls.find((call: any) =>
        call[0].action === 'reviewed' && call[0].reason === 'Looks complete'
      );
      expect(eventInsert).toBeDefined();
    });

    it('should reject review if status is already approved', async () => {
      const approvedOutput = { id: OUTPUT_ID, firm_id: FIRM_ID, status: 'approved' };
      mockSupabase.single.mockResolvedValueOnce({ data: approvedOutput, error: null });

      await expect(reviewAiOutput(OUTPUT_ID, { reason: 'OK' })).rejects.toThrow(
        'Only draft AI outputs can be reviewed.'
      );
    });
  });

  describe('approveAiOutput', () => {
    it('should approve a draft/reviewed output, write audit, and log matter timeline event', async () => {
      const reviewedOutput = { id: OUTPUT_ID, firm_id: FIRM_ID, status: 'reviewed', matter_id: MATTER_ID, document_id: DOC_ID };
      mockSupabase.single.mockResolvedValueOnce({ data: reviewedOutput, error: null });

      mockSupabase.update.mockImplementation(() => mockSupabase);
      mockSupabase.insert.mockImplementation(() => mockSupabase);

      const res = await approveAiOutput(OUTPUT_ID, { reason: 'Verified quotes' });
      expect(res.success).toBe(true);

      // Check event
      const eventInsert = mockSupabase.insert.mock.calls.find((call: any) =>
        call[0].action === 'approved' && call[0].reason === 'Verified quotes'
      );
      expect(eventInsert).toBeDefined();

      // Check timeline event
      const timelineInsert = mockSupabase.insert.mock.calls.find((call: any) =>
        call[0].title === 'AI Summary Approved'
      );
      expect(timelineInsert).toBeDefined();

      // Check document update (approval sync)
      const docUpdate = mockSupabase.update.mock.calls.find((call: any) =>
        call[0].approval_status === 'approved' && call[0].status === 'approved'
      );
      expect(docUpdate).toBeDefined();
    });
  });

  describe('rejectAiOutput', () => {
    it('should reject the output and fail if reason is shorter than 5 characters', async () => {
      const draftOutput = { id: OUTPUT_ID, firm_id: FIRM_ID, status: 'draft' };
      mockSupabase.single.mockResolvedValueOnce({ data: draftOutput, error: null });

      await expect(rejectAiOutput(OUTPUT_ID, { reason: 'bad' })).rejects.toThrow();
    });

    it('should reject with valid reason, update status, and write events', async () => {
      const draftOutput = { id: OUTPUT_ID, firm_id: FIRM_ID, status: 'draft', matter_id: MATTER_ID, document_id: DOC_ID };
      mockSupabase.single.mockResolvedValueOnce({ data: draftOutput, error: null });

      mockSupabase.update.mockImplementation(() => mockSupabase);
      mockSupabase.insert.mockImplementation(() => mockSupabase);

      const res = await rejectAiOutput(OUTPUT_ID, { reason: 'Incorrect claim amount referenced.' });
      expect(res.success).toBe(true);

      // Check event
      const eventInsert = mockSupabase.insert.mock.calls.find((call: any) =>
        call[0].action === 'rejected' && call[0].reason === 'Incorrect claim amount referenced.'
      );
      expect(eventInsert).toBeDefined();

      // Check document sync rejection
      const docUpdate = mockSupabase.update.mock.calls.find((call: any) =>
        call[0].approval_status === 'rejected' && call[0].status === 'rejected'
      );
      expect(docUpdate).toBeDefined();
    });
  });

  describe('supersedeAiOutput', () => {
    it('should block supersession of non-approved outputs', async () => {
      const draftOutput = { id: OUTPUT_ID, firm_id: FIRM_ID, status: 'draft' };
      mockSupabase.single.mockResolvedValueOnce({ data: draftOutput, error: null });

      await expect(supersedeAiOutput(OUTPUT_ID, {})).rejects.toThrow(
        'Only approved AI outputs can be superseded.'
      );
    });

    it('should supersede parent output, mark status, and link replacement draft', async () => {
      const approvedParent = { id: OUTPUT_ID, firm_id: FIRM_ID, status: 'approved', matter_id: MATTER_ID };
      const replacementInput = {
        matter_id: MATTER_ID,
        document_id: DOC_ID,
        output_type: 'document_summary',
        title: 'sum-title-v2',
        content: { summary: 'text v2' },
        confidence: 'high',
        citations: [
          {
            source_type: 'extraction',
            source_ref_id: EXT_ID,
            document_id: DOC_ID,
            document_version_id: VER_ID
          }
        ]
      };

      // Mock order:
      // 1. supersede parent check
      mockSupabase.single.mockResolvedValueOnce({ data: approvedParent, error: null });
      // 2. create new output: matter check
      mockSupabase.single.mockResolvedValueOnce({ data: { id: MATTER_ID }, error: null });
      // 3. create new output: doc check
      mockSupabase.single.mockResolvedValueOnce({ data: { id: DOC_ID }, error: null });
      // 4. create new output: cite doc check
      mockSupabase.single.mockResolvedValueOnce({ data: { id: DOC_ID }, error: null });
      // 5. create new output: cite ext check
      mockSupabase.single.mockResolvedValueOnce({ data: { id: EXT_ID }, error: null });
      // 6. create new output: AI output insert single response
      mockSupabase.single.mockResolvedValueOnce({ data: { id: OUTPUT_ID2 }, error: null });

      mockSupabase.update.mockImplementation(() => mockSupabase);
      mockSupabase.insert.mockImplementation(() => mockSupabase);

      const res = await supersedeAiOutput(OUTPUT_ID, replacementInput);
      expect(res).toBeDefined();
      expect(res.id).toBe(OUTPUT_ID2);

      // Verify parent was updated to status superseded
      const parentUpdate = mockSupabase.update.mock.calls.find((call: any) =>
        call[0].status === 'superseded'
      );
      expect(parentUpdate).toBeDefined();

      // Verify link new output back to parent supersession ref
      const linkUpdate = mockSupabase.update.mock.calls.find((call: any) =>
        call[0].supersedes_ai_output_id === OUTPUT_ID
      );
      expect(linkUpdate).toBeDefined();
    });
  });

  describe('createPlaceholderAiOutputFromExtraction', () => {
    it('should create summary from extraction and compile details', async () => {
      const ext = { id: EXT_ID, document_version_id: VER_ID, matter_id: MATTER_ID, extracted_text: 'sample text content' };
      const doc = { id: DOC_ID, title: 'test.pdf', category: 'Pleading' };

      // Mock order:
      // 1. extraction maybeSingle
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: ext, error: null });
      // 2. doc single
      mockSupabase.single.mockResolvedValueOnce({ data: doc, error: null });
      // 3. create output checks: matter check
      mockSupabase.single.mockResolvedValueOnce({ data: { id: MATTER_ID }, error: null });
      // 4. create output checks: doc check
      mockSupabase.single.mockResolvedValueOnce({ data: { id: DOC_ID }, error: null });
      // 5. create output checks: cite doc check
      mockSupabase.single.mockResolvedValueOnce({ data: { id: DOC_ID }, error: null });
      // 6. create output checks: cite ext check
      mockSupabase.single.mockResolvedValueOnce({ data: { id: EXT_ID }, error: null });
      // 7. create output insert single response
      mockSupabase.single.mockResolvedValueOnce({ data: { id: OUTPUT_ID }, error: null });

      mockSupabase.insert.mockImplementation(() => mockSupabase);

      const res = await createPlaceholderAiOutputFromExtraction(DOC_ID);
      expect(res.success).toBe(true);
      expect(res.aiOutputId).toBe(OUTPUT_ID);
    });
  });

  describe('getMatterAiOutputs', () => {
    it('should return ai outputs for the authenticated firm matter', async () => {
      mockSupabase.order = vi.fn().mockResolvedValueOnce({ data: [{ id: OUTPUT_ID }], error: null });
      const res = await getMatterAiOutputs(MATTER_ID);
      expect(res).toBeDefined();
    });
  });

  describe('getDocumentAiOutputs', () => {
    it('should return ai outputs for the authenticated firm document', async () => {
      mockSupabase.order = vi.fn().mockResolvedValueOnce({ data: [{ id: OUTPUT_ID }], error: null });
      const res = await getDocumentAiOutputs(DOC_ID);
      expect(res).toBeDefined();
    });
  });

  describe('getAiOutputWithSources', () => {
    it('should return AI output with its citation sources', async () => {
      // First .single() call returns the AI output
      mockSupabase.single.mockResolvedValueOnce({ data: { id: OUTPUT_ID, firm_id: FIRM_ID }, error: null });
      // Second chain (ai_output_sources query) terminates in .eq() without .single()
      // So we make the last .eq() in the chain resolve directly
      let eqCallCount = 0;
      mockSupabase.eq = vi.fn().mockImplementation((..._args: any[]) => {
        eqCallCount++;
        if (eqCallCount >= 4) {
          // Last eq in the sources chain - resolve with data
          return Promise.resolve({ data: [{ id: 'src-1' }], error: null });
        }
        return mockSupabase;
      });

      const res = await getAiOutputWithSources(OUTPUT_ID);
      expect(res).toBeDefined();
      expect(res.id).toBe(OUTPUT_ID);
    });
  });
});
