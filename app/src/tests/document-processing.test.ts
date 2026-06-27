import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getQueuedDocumentProcessingJobs,
  processDocumentExtractionJob,
  getDocumentExtractions
} from '../server/actions/document-processing.actions';
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

describe('Document Processing Server Actions', () => {
  const mockAuthUser = {
    userId: 'user-practitioner-123',
    firmId: 'firm-jhb-456',
    role: 'Practitioner'
  };

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth user session
    vi.mocked(requireAuthUser).mockResolvedValue(mockAuthUser as any);

    // Build reusable mock supabase database client
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

  describe('getQueuedDocumentProcessingJobs', () => {
    it('should return queued extraction jobs belonging to the current firm', async () => {
      const mockJobs = [
        { id: 'job-1', firm_id: 'firm-jhb-456', status: 'queued', job_type: 'extraction' }
      ];

      mockSupabase.order.mockResolvedValueOnce({ data: mockJobs, error: null });

      const res = await getQueuedDocumentProcessingJobs();
      expect(res).toEqual(mockJobs);
      expect(mockSupabase.eq).toHaveBeenCalledWith('firm_id', 'firm-jhb-456');
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'queued');
      expect(mockSupabase.eq).toHaveBeenCalledWith('job_type', 'extraction');
    });

    it('should throw error when select query fails', async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: { message: 'DB Error' } });

      await expect(getQueuedDocumentProcessingJobs()).rejects.toThrow('DB Error');
    });
  });

  describe('processDocumentExtractionJob', () => {
    it('should reject processing if job does not exist or firm ID mismatched', async () => {
      // Job select returns null (or mismatch)
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'No row' } });

      const res = await processDocumentExtractionJob('job-mismatch');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('should reject if job firm_id does not match practitioner firm_id', async () => {
      const foreignJob = { id: 'job-foreign', firm_id: 'firm-other-999', status: 'queued', job_type: 'extraction' };
      mockSupabase.single.mockResolvedValueOnce({ data: foreignJob, error: null });

      const res = await processDocumentExtractionJob('job-foreign');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied: Job not found or firm mismatch.');
    });

    it('should reject if job is not queued or type is not extraction', async () => {
      const completedJob = { id: 'job-done', firm_id: 'firm-jhb-456', status: 'completed', job_type: 'extraction' };
      mockSupabase.single.mockResolvedValueOnce({ data: completedJob, error: null });

      const res = await processDocumentExtractionJob('job-done');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid job state');
    });

    it('should cancel the job and log block when document is flagged for AI exclusion', async () => {
      const job = { id: 'job-1', firm_id: 'firm-jhb-456', status: 'queued', job_type: 'extraction', document_id: 'doc-1', document_version_id: 'ver-1' };
      const doc = { id: 'doc-1', title: 'Exclusion Doc', is_ai_excluded: true };

      // 1. Mock select job
      mockSupabase.single.mockResolvedValueOnce({ data: job, error: null });
      // 2. Mock select document
      mockSupabase.single.mockResolvedValueOnce({ data: doc, error: null });

      // Mock update & insert methods to succeed
      mockSupabase.update.mockImplementation(() => mockSupabase);
      mockSupabase.insert.mockImplementation(() => mockSupabase);

      const res = await processDocumentExtractionJob('job-1');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Document is flagged for AI exclusion.');

      // Check job update was called to set status to cancelled
      const updateCall = mockSupabase.update.mock.calls.find((call: any) =>
        call[0].status === 'cancelled' && call[0].error_message === 'Document is flagged for AI exclusion.'
      );
      expect(updateCall).toBeDefined();

      // Check audit log contains blocked action
      const auditCall = mockSupabase.insert.mock.calls.find((call: any) =>
        call[0].action === 'BLOCK_DOCUMENT_EXTRACTION_EXCLUDED'
      );
      expect(auditCall).toBeDefined();
    });

    it('should process job, create extraction row, and set job status to completed', async () => {
      const job = { id: 'job-1', firm_id: 'firm-jhb-456', status: 'queued', job_type: 'extraction', document_id: 'doc-1', document_version_id: 'ver-1', matter_id: 'matter-1' };
      const doc = { id: 'doc-1', title: 'Allowed Doc', is_ai_excluded: false };
      const version = { file_name: 'test.pdf', mime_type: 'application/pdf', file_size: 1024, storage_path: 'path/to/test.pdf' };

      // Mock order of singles:
      // 1. job
      // 2. doc
      // 3. version
      mockSupabase.single
        .mockResolvedValueOnce({ data: job, error: null })
        .mockResolvedValueOnce({ data: doc, error: null })
        .mockResolvedValueOnce({ data: version, error: null });

      // Idempotency: no existing extraction row
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      mockSupabase.update.mockImplementation(() => mockSupabase);
      mockSupabase.insert.mockImplementation(() => mockSupabase);

      const res = await processDocumentExtractionJob('job-1');
      expect(res.success).toBe(true);
      expect(res.extractionId).toBeDefined();

      // Verify that extraction is written as draft, with correct fields
      const extInsert = mockSupabase.insert.mock.calls.find((call: any) =>
        call[0].extraction_type === 'text' && call[0].confidence === 'low'
      );
      expect(extInsert).toBeDefined();
      expect(extInsert[0].extracted_text).toContain('Placeholder extraction for test.pdf');
      expect(extInsert[0].extracted_fields.note).toBe('Extraction is simulated.');

      // Verify job update calls (started processing, then completed)
      const completionCall = mockSupabase.update.mock.calls.find((call: any) =>
        call[0].status === 'completed'
      );
      expect(completionCall).toBeDefined();
    });

    it('should skip creating document extraction if extraction row already exists (idempotency)', async () => {
      const job = { id: 'job-1', firm_id: 'firm-jhb-456', status: 'queued', job_type: 'extraction', document_id: 'doc-1', document_version_id: 'ver-1', matter_id: 'matter-1' };
      const doc = { id: 'doc-1', title: 'Allowed Doc', is_ai_excluded: false };
      const version = { file_name: 'test.pdf', mime_type: 'application/pdf', file_size: 1024, storage_path: 'path/to/test.pdf' };
      const existingExt = { id: 'existing-ext-123' };

      mockSupabase.single
        .mockResolvedValueOnce({ data: job, error: null })
        .mockResolvedValueOnce({ data: doc, error: null })
        .mockResolvedValueOnce({ data: version, error: null });

      // Idempotency returns existing row
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: existingExt, error: null });

      mockSupabase.update.mockImplementation(() => mockSupabase);
      mockSupabase.insert.mockImplementation(() => mockSupabase);

      const res = await processDocumentExtractionJob('job-1');
      expect(res.success).toBe(true);
      expect(res.extractionId).toBe('existing-ext-123');

      // Verify that NO document_extractions insert call was made
      const extInsert = mockSupabase.insert.mock.calls.find((call: any) =>
        call[0].extraction_type === 'text'
      );
      expect(extInsert).toBeUndefined();

      // Verify job completed update occurred
      const completionCall = mockSupabase.update.mock.calls.find((call: any) =>
        call[0].status === 'completed'
      );
      expect(completionCall).toBeDefined();
    });

    it('should set status to failed and record error message if an internal error is thrown', async () => {
      const job = { id: 'job-1', firm_id: 'firm-jhb-456', status: 'queued', job_type: 'extraction', document_id: 'doc-1', document_version_id: 'ver-1', matter_id: 'matter-1' };
      const doc = { id: 'doc-1', title: 'Allowed Doc', is_ai_excluded: false };

      mockSupabase.single
        .mockResolvedValueOnce({ data: job, error: null })
        .mockResolvedValueOnce({ data: doc, error: null });

      // Mock version load error
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Connection Timeout' } });

      mockSupabase.update.mockImplementation(() => mockSupabase);
      mockSupabase.insert.mockImplementation(() => mockSupabase);

      const res = await processDocumentExtractionJob('job-1');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Connection Timeout');

      // Verify status updated to failed
      const failureCall = mockSupabase.update.mock.calls.find((call: any) =>
        call[0].status === 'failed' && call[0].error_message.includes('Connection Timeout')
      );
      expect(failureCall).toBeDefined();

      // Verify audit logged failure
      const failureAudit = mockSupabase.insert.mock.calls.find((call: any) =>
        call[0].action === 'FAIL_DOCUMENT_EXTRACTION'
      );
      expect(failureAudit).toBeDefined();
    });
  });

  describe('getDocumentExtractions', () => {
    it('should fetch extractions for same-firm document IDs', async () => {
      const mockExtractions = [
        { id: 'ext-1', document_id: 'doc-1', firm_id: 'firm-jhb-456', extracted_text: 'sample' }
      ];

      mockSupabase.order.mockResolvedValueOnce({ data: mockExtractions, error: null });

      const res = await getDocumentExtractions('doc-1');
      expect(res).toEqual(mockExtractions);
      expect(mockSupabase.eq).toHaveBeenCalledWith('document_id', 'doc-1');
      expect(mockSupabase.eq).toHaveBeenCalledWith('firm_id', 'firm-jhb-456');
    });

    it('should throw error when select query fails', async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: { message: 'Query Failed' } });

      await expect(getDocumentExtractions('doc-1')).rejects.toThrow('Query Failed');
    });
  });
});
