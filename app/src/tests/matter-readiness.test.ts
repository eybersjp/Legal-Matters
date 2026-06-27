import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runMatterReadinessCheck,
  getMatterReadinessChecks,
  getLatestMatterReadinessCheck,
  getMatterReadinessItems,
} from '../server/actions/matter-readiness.actions';
import { requireAuthUser } from '../lib/auth';
import { createAdminClient } from '../lib/supabase/server';

vi.mock('../lib/auth', () => ({
  requireAuthUser: vi.fn(),
}));

vi.mock('../lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Shared test fixtures — all UUIDs
// ---------------------------------------------------------------------------
const FIRM_ID   = 'aaabbbcc-0000-4000-8000-000000000001';
const USER_ID   = 'aaabbbcc-0000-4000-8000-000000000002';
const MATTER_ID = 'aaabbbcc-0000-4000-8000-000000000003';
const CROSS_ID  = 'deaddead-0000-4000-8000-000000000099';
const CHECK_ID  = 'aaabbbcc-0000-4000-8000-000000000004';
const TASK_ID   = 'aaabbbcc-0000-4000-8000-000000000005';
const DL_ID     = 'aaabbbcc-0000-4000-8000-000000000006';
const DOC_ID    = 'aaabbbcc-0000-4000-8000-000000000007';
const EXT_ID    = 'aaabbbcc-0000-4000-8000-000000000008';
const AI_ID     = 'aaabbbcc-0000-4000-8000-000000000009';
const INV_ID    = 'aaabbbcc-0000-4000-8000-000000000010';
const EXP_ID    = 'aaabbbcc-0000-4000-8000-000000000012';

const mockAuthUser = {
  userId: USER_ID,
  firmId: FIRM_ID,
  role: 'Practitioner',
};

const completeMatter = {
  id: MATTER_ID,
  title: 'Test Matter',
  status: 'Active',
  description: 'This is a sufficiently detailed matter description.',
  case_number: 'A/123/2026',
  court_jurisdiction: 'Gauteng High Court',
  client_id: 'aaabbbcc-0000-4000-8000-000000000099',
  closed_at: null,
};

describe('Matter Readiness Engine', () => {
  let mockSupabase: any;
  let currentTable = '';
  let dbState: Record<string, any[]>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthUser).mockResolvedValue(mockAuthUser as any);

    dbState = {
      matters: [],
      documents: [],
      document_extractions: [],
      ai_outputs: [],
      matter_tasks: [],
      matter_deadlines: [],
      time_entries: [],
      expenses: [],
      invoices: [],
      matter_readiness_checks: [],
      matter_readiness_items: [],
    };

    currentTable = '';

    mockSupabase = {
      from: vi.fn().mockImplementation((table) => {
        currentTable = table;
        return mockSupabase;
      }),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockImplementation((payload) => {
        const payloadArray = Array.isArray(payload) ? payload : [payload];
        dbState[currentTable]?.push(...payloadArray);
        return Promise.resolve({ error: null });
      }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => {
        const rows = dbState[currentTable] || [];
        return Promise.resolve({ data: rows[0] || null, error: rows.length ? null : new Error('No rows found') });
      }),
      maybeSingle: vi.fn().mockImplementation(() => {
        const rows = dbState[currentTable] || [];
        return Promise.resolve({ data: rows[0] || null, error: null });
      }),
      then: vi.fn().mockImplementation((onfulfilled) => {
        const rows = dbState[currentTable] || [];
        return Promise.resolve({ data: rows, error: null }).then(onfulfilled);
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);
  });

  function setupFullyReadyMatter() {
    dbState.matters = [completeMatter];
    dbState.documents = [{ id: DOC_ID, title: 'Pleading', status: 'active', category: 'Pleading' }];
    dbState.document_extractions = [{ id: EXT_ID, document_id: DOC_ID, confidence: 'high' }];
    dbState.ai_outputs = [{ id: AI_ID, status: 'approved', confidence: 'high', output_type: 'summary' }];
    dbState.matter_tasks = [];
    dbState.matter_deadlines = [];
    dbState.time_entries = [];
    dbState.expenses = [];
    dbState.invoices = [];
  }

  // =========================================================================
  // 1. Creates check + items rows
  // =========================================================================
  describe('runMatterReadinessCheck', () => {
    it('should create a readiness check row and item rows', async () => {
      setupFullyReadyMatter();

      const result = await runMatterReadinessCheck(MATTER_ID, 'full');

      expect(result.check_id).toBeDefined();
      expect(result.matter_id).toBe(MATTER_ID);
      expect(result.firm_id).toBe(FIRM_ID);
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBeGreaterThan(0);

      // Verify database state contains the inserted check
      expect(dbState.matter_readiness_checks.length).toBe(1);
      expect(dbState.matter_readiness_checks[0].firm_id).toBe(FIRM_ID);
      expect(dbState.matter_readiness_checks[0].matter_id).toBe(MATTER_ID);
      expect(dbState.matter_readiness_checks[0].score).toBeGreaterThanOrEqual(85);
    });

    // -----------------------------------------------------------------------
    // 2. Complete matter scores 85+
    // -----------------------------------------------------------------------
    it('should score higher for a complete matter with no issues', async () => {
      setupFullyReadyMatter();
      const result = await runMatterReadinessCheck(MATTER_ID, 'full');
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.status).toBe('ready');
    });

    // -----------------------------------------------------------------------
    // 3. Missing documents → high severity missing item
    // -----------------------------------------------------------------------
    it('should create a missing item when no documents are uploaded', async () => {
      dbState.matters = [completeMatter];
      dbState.documents = [];
      dbState.document_extractions = [];
      dbState.ai_outputs = [];
      dbState.matter_tasks = [];
      dbState.matter_deadlines = [];
      dbState.time_entries = [];
      dbState.expenses = [];
      dbState.invoices = [];

      const result = await runMatterReadinessCheck(MATTER_ID, 'full');

      const missingDocItem = result.items.find(
        (i) => i.category === 'documents' && i.status === 'missing' && i.severity === 'high'
      );
      expect(missingDocItem).toBeDefined();
      expect(result.score).toBeLessThan(85);
    });

    // -----------------------------------------------------------------------
    // 4. Open non-overdue tasks → medium warning reduces score
    // -----------------------------------------------------------------------
    it('should reduce score when there are open non-overdue tasks', async () => {
      const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();
      dbState.matters = [completeMatter];
      dbState.documents = [{ id: DOC_ID, category: 'Pleading', status: 'active' }];
      dbState.document_extractions = [{ id: EXT_ID, confidence: 'high' }];
      dbState.ai_outputs = [{ id: AI_ID, status: 'approved' }];
      dbState.matter_tasks = [{ id: TASK_ID, title: 'Review', status: 'In Progress', due_date: futureDate }];

      const result = await runMatterReadinessCheck(MATTER_ID, 'full');

      const taskItem = result.items.find(
        (i) => i.category === 'tasks' && i.status === 'warning'
      );
      expect(taskItem).toBeDefined();
      expect(result.score).toBeLessThan(100);
    });

    // -----------------------------------------------------------------------
    // 5. Overdue deadlines → critical blocked item + not_ready
    // -----------------------------------------------------------------------
    it('should create a blocked critical item for overdue deadlines', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      dbState.matters = [completeMatter];
      dbState.documents = [{ id: DOC_ID, category: 'Pleading', status: 'active' }];
      dbState.document_extractions = [{ id: EXT_ID, confidence: 'high' }];
      dbState.ai_outputs = [{ id: AI_ID, status: 'approved' }];
      dbState.matter_deadlines = [{ id: DL_ID, title: 'File heads', deadline_date: yesterday, is_completed: false }];

      const result = await runMatterReadinessCheck(MATTER_ID, 'full');

      const overdueItem = result.items.find(
        (i) => i.category === 'deadlines' && i.status === 'blocked' && i.severity === 'critical'
      );
      expect(overdueItem).toBeDefined();
      expect(result.status).toBe('not_ready');
    });

    // -----------------------------------------------------------------------
    // 6. Unpaid invoices → high severity missing item
    // -----------------------------------------------------------------------
    it('should flag unpaid invoices as high severity missing item', async () => {
      dbState.matters = [completeMatter];
      dbState.documents = [{ id: DOC_ID, category: 'Pleading', status: 'active' }];
      dbState.document_extractions = [{ id: EXT_ID, confidence: 'high' }];
      dbState.ai_outputs = [{ id: AI_ID, status: 'approved' }];
      dbState.invoices = [{ id: INV_ID, invoice_number: 'INV-001', status: 'Issued' }];

      const result = await runMatterReadinessCheck(MATTER_ID, 'full');

      const invItem = result.items.find(
        (i) => i.category === 'billing' && i.source_type === 'invoice' && i.status === 'missing'
      );
      expect(invItem).toBeDefined();
      expect(invItem?.severity).toBe('high');
    });

    // -----------------------------------------------------------------------
    // 7. Unbilled expenses → medium severity warning
    // -----------------------------------------------------------------------
    it('should warn when there are unbilled expenses', async () => {
      dbState.matters = [completeMatter];
      dbState.documents = [{ id: DOC_ID, category: 'Pleading', status: 'active' }];
      dbState.document_extractions = [{ id: EXT_ID, confidence: 'high' }];
      dbState.ai_outputs = [{ id: AI_ID, status: 'approved' }];
      dbState.expenses = [{ id: EXP_ID, is_billed: false }];

      const result = await runMatterReadinessCheck(MATTER_ID, 'full');

      const expItem = result.items.find(
        (i) => i.category === 'billing' && i.source_type === 'expense' && i.status === 'warning'
        && i.label.includes('disbursement')
      );
      expect(expItem).toBeDefined();
    });

    // -----------------------------------------------------------------------
    // 8. AI outputs with none approved → warning with "Review and approve" recommendation
    // -----------------------------------------------------------------------
    it('should warn when AI outputs are present but none are approved', async () => {
      dbState.matters = [completeMatter];
      dbState.documents = [{ id: DOC_ID, category: 'Pleading', status: 'active' }];
      dbState.document_extractions = [{ id: EXT_ID, confidence: 'high' }];
      dbState.ai_outputs = [{ id: AI_ID, status: 'draft', confidence: 'medium', output_type: 'summary' }];

      const result = await runMatterReadinessCheck(MATTER_ID, 'full');

      const aiWarnItem = result.items.find(
        (i) => i.category === 'ai_outputs' && i.status === 'warning'
      );
      expect(aiWarnItem).toBeDefined();
      expect(aiWarnItem?.recommendation).toContain('Review and approve');
    });

    // -----------------------------------------------------------------------
    // 9. Cross-firm matter ID is rejected
    // -----------------------------------------------------------------------
    it('should reject cross-firm matter IDs', async () => {
      // Return error for matters query
      mockSupabase.single.mockImplementation(() => {
        return Promise.resolve({ data: null, error: new Error('No rows found') });
      });

      await expect(
        runMatterReadinessCheck(CROSS_ID, 'full')
      ).rejects.toThrow('Access denied: Matter not found or belongs to another firm.');
    });

    // -----------------------------------------------------------------------
    // 10. Critical blocked item forces not_ready regardless of score
    // -----------------------------------------------------------------------
    it('should force status to not_ready if any critical blocked item exists', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      dbState.matters = [completeMatter];
      dbState.documents = [{ id: DOC_ID, category: 'Pleading', status: 'active' }];
      dbState.document_extractions = [{ id: EXT_ID, confidence: 'high' }];
      dbState.ai_outputs = [{ id: AI_ID, status: 'approved' }];
      dbState.matter_tasks = [{ id: TASK_ID, title: 'Overdue', status: 'Pending', due_date: yesterday }];

      const result = await runMatterReadinessCheck(MATTER_ID, 'full');

      const criticalItem = result.items.find(
        (i) => i.severity === 'critical' && i.status === 'blocked'
      );
      expect(criticalItem).toBeDefined();
      expect(result.status).toBe('not_ready');
    });

    // -----------------------------------------------------------------------
    // 11. Advisory note always present
    // -----------------------------------------------------------------------
    it('should always include an advisory note disclaiming legal advice', async () => {
      setupFullyReadyMatter();
      const result = await runMatterReadinessCheck(MATTER_ID, 'full');
      expect(result.advisory_note).toContain('advisory tool only');
      expect(result.advisory_note).toContain('attorney review');
    });

    // -----------------------------------------------------------------------
    // 12. Scoped readiness_type: tasks only
    // -----------------------------------------------------------------------
    it('should only check tasks when readiness_type is "tasks"', async () => {
      dbState.matters = [completeMatter];
      dbState.matter_tasks = [{ id: TASK_ID, title: 'Open task', status: 'In Progress', due_date: null }];

      const result = await runMatterReadinessCheck(MATTER_ID, 'tasks');

      expect(result.readiness_type).toBe('tasks');
      const taskItems = result.items.filter((i) => i.category === 'tasks');
      expect(taskItems.length).toBeGreaterThan(0);

      // Should NOT have billing category items
      const billingItems = result.items.filter((i) => i.category === 'billing');
      expect(billingItems.length).toBe(0);
    });
  });

  // =========================================================================
  // getMatterReadinessChecks
  // =========================================================================
  describe('getMatterReadinessChecks', () => {
    it('should return all readiness checks for a matter, newest first', async () => {
      const mockChecks = [
        { id: CHECK_ID, readiness_type: 'full', score: 90, status: 'ready', checked_at: '2026-06-14T18:00:00Z' },
      ];

      dbState.matters = [{ id: MATTER_ID }];
      dbState.matter_readiness_checks = mockChecks;

      const result = await getMatterReadinessChecks(MATTER_ID);

      expect(result).toEqual(mockChecks);
    });

    it('should reject cross-firm matter ID for getMatterReadinessChecks', async () => {
      mockSupabase.single.mockImplementation(() => {
        return Promise.resolve({ data: null, error: new Error('No rows found') });
      });

      await expect(getMatterReadinessChecks(CROSS_ID)).rejects.toThrow(
        'Access denied: Matter not found or belongs to another firm.'
      );
    });
  });

  // =========================================================================
  // getLatestMatterReadinessCheck
  // =========================================================================
  describe('getLatestMatterReadinessCheck', () => {
    it('should return the most recent readiness check', async () => {
      const latestCheck = {
        id: CHECK_ID,
        readiness_type: 'full',
        score: 88,
        status: 'ready',
        checked_at: '2026-06-14T18:00:00Z',
      };

      dbState.matters = [{ id: MATTER_ID }];
      dbState.matter_readiness_checks = [latestCheck];

      const result = await getLatestMatterReadinessCheck(MATTER_ID);

      expect(result).toEqual(latestCheck);
    });

    it('should return null when no checks exist yet', async () => {
      dbState.matters = [{ id: MATTER_ID }];
      dbState.matter_readiness_checks = [];

      const result = await getLatestMatterReadinessCheck(MATTER_ID);

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // getMatterReadinessItems
  // =========================================================================
  describe('getMatterReadinessItems', () => {
    it('should return all items for a readiness check, firm-scoped', async () => {
      const mockItems = [
        {
          id: 'aaabbbcc-0000-4000-8000-000000000020',
          category: 'documents',
          label: 'No documents uploaded',
          status: 'missing',
          severity: 'high',
          source_type: 'document',
          source_ref_id: null,
          recommendation: 'Upload documents.',
        },
      ];

      dbState.matter_readiness_items = mockItems;

      const result = await getMatterReadinessItems(CHECK_ID);

      expect(result).toEqual(mockItems);
    });

    it('should throw if the readiness items query fails', async () => {
      // Mock error on order call
      mockSupabase.then.mockImplementationOnce((onfulfilled: any) => {
        return Promise.resolve({ data: null, error: new Error('DB error') }).then(onfulfilled);
      });

      await expect(getMatterReadinessItems(CHECK_ID)).rejects.toThrow('DB error');
    });
  });
});
