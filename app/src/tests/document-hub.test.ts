import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  uploadDocument,
  createDocumentVersion,
  archiveDocument,
  generatePlaceholderAISummary,
  approveRejectAISummary
} from '../server/actions/document.actions';
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

describe('Secure Document Hub Server Actions', () => {
  const mockAuthUser = {
    userId: 'user-attorney-123',
    firmId: 'firm-jhb-456',
    role: 'Partner'
  };

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock auth user
    vi.mocked(requireAuthUser).mockResolvedValue(mockAuthUser as any);

    // Setup mock supabase database client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null })
      }
    };

    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);
  });

  describe('uploadDocument', () => {
    it('should reject upload if file is missing or invalid type', async () => {
      const formData = new FormData();
      formData.append('matterId', 'matter-123');
      formData.append('title', 'Test Document');
      // No file appended

      const res = await uploadDocument(formData);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Document file is required.');
    });

    it('should reject unsupported MIME types', async () => {
      const badFile = new File(['foo'], 'danger.exe', { type: 'application/x-msdownload' });
      const formData = new FormData();
      formData.append('matterId', 'matter-123');
      formData.append('title', 'Test Document');
      formData.append('file', badFile);

      // Mock matter check passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'matter-123', firm_id: 'firm-jhb-456', client_id: 'client-789' },
        error: null
      });

      const res = await uploadDocument(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid file type');
    });

    it('should reject file sizes exceeding 5MB', async () => {
      // 6MB buffer mock
      const largeFile = new File([new Uint8Array(6 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('matterId', 'matter-123');
      formData.append('title', 'Test Document');
      formData.append('file', largeFile);

      // Mock matter check passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'matter-123', firm_id: 'firm-jhb-456', client_id: 'client-789' },
        error: null
      });

      const res = await uploadDocument(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('File size exceeds the 5MB limit');
    });

    it('should reject upload if matter belongs to a different firm (cross-firm check)', async () => {
      const file = new File(['pdf-content'], 'statement.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('matterId', 'matter-cross-firm');
      formData.append('title', 'Foreign Matter Doc');
      formData.append('file', file);

      // Mock matter check returns empty (mismatch)
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      });

      const res = await uploadDocument(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access denied');
    });

    it('should succeed with allowed type, correct size, and same firm ownership', async () => {
      const file = new File(['pdf-content'], 'pleading.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('matterId', 'matter-123');
      formData.append('title', 'Particulars of Claim');
      formData.append('file', file);
      formData.append('classification', 'Pleading');
      formData.append('confidentiality', 'standard');

      // 1. Matter ownership query returns correct details
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'matter-123', firm_id: 'firm-jhb-456', client_id: 'client-789' },
        error: null
      });

      // 2. Document insert single mock
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'new-doc-uuid' },
        error: null
      });

      // 3. Version insert single mock (just returns insert chain)
      mockSupabase.insert.mockImplementation(() => mockSupabase);

      const res = await uploadDocument(formData);
      expect(res.success).toBe(true);

      // Verify storage path generation uses randomized path instead of filename
      const uploadCall = mockSupabase.storage.upload.mock.calls[0];
      const storagePath = uploadCall[0];
      expect(storagePath).not.toContain('pleading.pdf');
      expect(storagePath).toContain('firm-jhb-456/matter-123/');
    });
  });

  describe('generatePlaceholderAISummary', () => {
    it('should generate a low-confidence placeholder summary in pending status', async () => {
      // 1. Mock document query returns correct metadata
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'doc-123',
          firm_id: 'firm-jhb-456',
          matter_id: 'matter-123',
          title: 'Client Intake Memo',
          category: 'Internal Memo',
          document_versions: [{ file_name: 'intake.pdf' }]
        },
        error: null
      });

      // 2. Mock summary insertion
      mockSupabase.insert.mockImplementation(() => mockSupabase);

      const res = await generatePlaceholderAISummary('doc-123');
      expect(res.success).toBe(true);
      expect(res.data?.summaryId).toBeDefined();

      // Check summary details saved
      const insertCall = mockSupabase.insert.mock.calls.find((call: any) =>
        call[0].output_title === 'Placeholder Document Summary'
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[0].confidence_level).toBe('low');
      expect(insertCall[0].approval_status).toBe('pending');
    });
  });

  describe('approveRejectAISummary', () => {
    it('should update summary and document status on approval', async () => {
      // 1. Mock fetch summary returns summary details
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          document_id: 'doc-123',
          matter_id: 'matter-123',
          firm_id: 'firm-jhb-456'
        },
        error: null
      });

      // 2. Mock updates
      mockSupabase.update.mockImplementation(() => mockSupabase);

      const res = await approveRejectAISummary('summary-123', 'approved');
      expect(res.success).toBe(true);

      // Verify updates called for both summary and document
      const docUpdateCall = mockSupabase.update.mock.calls.find((call: any) =>
        call[0].status === 'approved' && call[0].approval_status === 'approved'
      );
      expect(docUpdateCall).toBeDefined();
    });
  });
});
