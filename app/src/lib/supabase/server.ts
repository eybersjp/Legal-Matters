import { createServerClient } from '@supabase/ssr';

/**
 * Creates a Supabase client with service role privileges for database operations.
 * Since Clerk handles authentication, this client bypasses RLS.
 * Auth verification is done via Clerk's auth() in each server action.
 */
let globalMockDataSets: Record<string, any[]> | null = null;
let globalMockData: Record<string, any> | null = null;

function getGlobalMockDataSets() {
  if (!globalMockDataSets) {
    globalMockDataSets = {
      clients: [{ id: 'mock-client-1', type: 'Individual', first_name: 'Sipho', last_name: 'Nkosi', sa_id_number: '9201015678087', email: 'sipho@nkosi.co.za', phone_number: '+27831234567', created_at: new Date().toISOString() }],
      matters: [{ id: 'mock-matter-1', title: 'Sipho Nkosi Divorce', case_number: '12345/26', status: 'Intake', client_id: 'mock-client-1', created_at: new Date().toISOString() }],
      documents: getMockDocuments(),
      notifications: [{ id: 'mock-notif-1', title: 'Pleading Deadline', message: 'Notice of Intention to Defend due in 2 days.', is_read: false, link_url: '/dashboard/deadlines', created_at: new Date().toISOString() }],
      matter_deadlines: [{ id: 'mock-deadline-1', title: 'Plea Due', calculated_deadline: new Date(Date.now() + 86400000 * 2).toISOString(), matters: { id: 'mock-matter-1', title: 'Sipho Nkosi Divorce', case_number: '12345/26' } }],
      audit_logs: [{ id: 'mock-audit-1', action: 'READ_PII', resource_type: 'client', created_at: new Date().toISOString(), user_id: 'mock-user-uuid' }],
      user_profiles: [{ member_id: 'mock-user-uuid', first_name: 'Sipho', last_name: 'Nkosi', firm_members: { id: 'mock-user-uuid', firm_id: 'mock-firm-uuid' } }],
      invoices: [{ id: 'mock-invoice-1', invoice_number: 'INV-00000001', total_including_vat: 15000, status: 'Issued', due_date: new Date().toISOString(), clients: { first_name: 'Sipho', last_name: 'Nkosi' }, matters: { title: 'Sipho Nkosi Divorce' } }],
      popia_consents: [{ id: 'mock-consent-1', client_id: 'mock-client-id', consented_to_processing: true, expires_at: new Date(Date.now() + 5 * 365 * 86400000).toISOString() }],
      document_versions: [
        {
          id: 'mock-ver-1',
          version_number: 1,
          file_name: 'summons.pdf',
          file_size: 102400,
          mime_type: 'application/pdf',
          classification: 'Pleading',
          created_at: new Date().toISOString()
        }
      ],
      ai_outputs: [
        {
          id: 'mock-ai-output-1',
          title: 'Summons and Particulars of Claim Summary',
          output_type: 'summary',
          content: {
            document_type: 'Pleading',
            key_facts: ['Plaintiff was injured in a car accident.', 'Defendant is MEC for Health.'],
            legal_obligations: ['MEC has duty of care.', 'Plaintiff must prove negligence.']
          },
          confidence: 'high',
          missing_information: ['Medical report missing', 'Accident report missing'],
          suggested_next_actions: ['Request medical records', 'Subpoena accident report'],
          status: 'draft',
          sources: [
            {
              id: 'cite-1',
              source_type: 'Pleading',
              source_label: 'Summons Page 2',
              page_number: 2,
              quote: 'The plaintiff was admitted to hospital on 2026-01-01.'
            }
          ],
          document_id: 'mock-doc-1',
          matter_id: 'mock-matter-1',
          firm_id: 'mock-firm-uuid',
          created_at: new Date().toISOString()
        }
      ],
      matter_readiness_checks: [
        {
          id: 'mock-readiness-check-1',
          matter_id: 'mock-matter-1',
          firm_id: 'mock-firm-uuid',
          readiness_type: 'full',
          score: 95,
          status: 'ready',
          advisory_note: 'This is a mock advisory tool only.',
          checked_at: new Date().toISOString(),
          checked_by: 'mock-user-uuid'
        }
      ],
      matter_readiness_items: [
        {
          id: 'mock-item-1',
          readiness_check_id: 'mock-readiness-check-1',
          category: 'documents',
          label: 'Mandatory FICA documents on file',
          status: 'passed',
          severity: 'info',
          recommendation: null
        },
        {
          id: 'mock-item-2',
          readiness_check_id: 'mock-readiness-check-1',
          category: 'deadlines',
          label: 'Unresolved court pleading deadlines',
          status: 'warning',
          severity: 'medium',
          recommendation: 'Respond to summons within 10 court days.'
        },
        {
          id: 'mock-item-3',
          readiness_check_id: 'mock-readiness-check-1',
          category: 'billing',
          label: 'Trust ledger deficit detected',
          status: 'blocked',
          severity: 'critical',
          recommendation: 'Resolve billing discrepancy before closure.'
        }
      ]
    };
  }
  return globalMockDataSets;
}

function getGlobalMockData() {
  if (!globalMockData) {
    globalMockData = {
      clients: { id: 'mock-client-1', type: 'Individual', first_name: 'Sipho', last_name: 'Nkosi', sa_id_number: '9201015678087', email: 'sipho@nkosi.co.za', phone_number: '+27831234567' },
      matters: { id: 'mock-matter-1', title: 'Sipho Nkosi Divorce', case_number: '12345/26', status: 'Intake', client_id: 'mock-client-1' },
      firms: { id: 'mock-firm-uuid', name: 'Test Firm' },
      firm_members: { id: 'mock-user-uuid', firm_id: 'mock-firm-uuid', role: 'Partner' },
      invoices: { id: 'mock-invoice-1', invoice_number: 'INV-00000001', total_including_vat: 15000 },
      popia_consents: { id: 'mock-consent-1', client_id: 'mock-client-id', consented_to_processing: true, expires_at: new Date(Date.now() + 5 * 365 * 86400000).toISOString() },
      ai_outputs: {
        id: 'mock-ai-output-1',
        title: 'Summons and Particulars of Claim Summary',
        output_type: 'summary',
        content: {
          document_type: 'Pleading',
          key_facts: ['Plaintiff was injured in a car accident.'],
          legal_obligations: ['MEC has duty of care.']
        },
        confidence: 'high',
        missing_information: ['Medical report missing'],
        suggested_next_actions: ['Request medical records'],
        status: 'draft',
        sources: [
          {
            id: 'cite-1',
            source_type: 'Pleading',
            source_label: 'Summons Page 2',
            page_number: 2,
            quote: 'The plaintiff was admitted to hospital on 2026-01-01.'
          }
        ],
        document_id: 'mock-doc-1',
        matter_id: 'mock-matter-1',
        firm_id: 'mock-firm-uuid'
      }
    };
  }
  return globalMockData;
}

export function createClient() {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    const mockDataSets = getGlobalMockDataSets();
    const mockData = getGlobalMockData();
    const mockChain: any = {
      from: (table: string) => {
        let currentId = '';
        const chain: any = {
          select: () => chain,
          insert: (payload: any) => {
            const arr = Array.isArray(payload) ? payload : [payload];
            if (!mockDataSets[table]) mockDataSets[table] = [];
            mockDataSets[table].push(...arr);
            return Promise.resolve({ error: null });
          },
          update: (payload: any) => {
            if (mockDataSets[table]) {
              mockDataSets[table].forEach(item => {
                if (!currentId || item.id === currentId) {
                  Object.assign(item, payload);
                }
              });
            }
            if (mockData[table] && (!currentId || mockData[table].id === currentId)) {
              Object.assign(mockData[table], payload);
            }
            return chain;
          },
          delete: () => {
            if (mockDataSets[table]) {
              if (currentId) {
                mockDataSets[table] = mockDataSets[table].filter(item => item.id !== currentId);
              } else {
                mockDataSets[table] = [];
              }
            }
            return chain;
          },
          eq: (col: string, val: string) => {
            if (col === 'id' || col === 'member_id' || col === 'user_id' || col === 'document_id') {
              currentId = val;
            }
            return chain;
          },
          neq: () => chain,
          not: () => chain,
          gte: () => chain,
          in: () => chain,
          single: async () => {
            // Check cross-firm matter check
            if (table === 'matters' && currentId === 'deaddead-0000-4000-8000-000000000099') {
              return { data: null, error: { message: 'Access denied: Matter not found or belongs to another firm.' } };
            }
            if (table === 'firm_members') {
              if (currentId === 'mock-user-no-firm-uuid') {
                return { data: null, error: { message: 'Row not found' } };
              }
              return { data: { id: 'mock-user-uuid', firm_id: 'mock-firm-uuid', role: 'Partner' }, error: null };
            }
            if (table === 'documents') {
              const docs = mockDataSets['documents'] || getMockDocuments();
              const d = docs.find(item => item.id === currentId) || docs[0];
              return { data: d, error: null };
            }
            if (table === 'document_ai_summaries') {
              const docs = mockDataSets['documents'] || getMockDocuments();
              const summaries = docs.flatMap(d => d.document_ai_summaries || []);
              const s = summaries.find(item => item?.id === currentId) || summaries[1];
              return { data: s ? { ...s, document_id: 'mock-doc-2', matter_id: 'mock-matter-1', firm_id: 'mock-firm-uuid' } : null, error: null };
            }
            if (mockDataSets[table]) {
              const row = mockDataSets[table].find(item => item.id === currentId);
              if (row) return { data: row, error: null };
            }
            return { data: mockData[table] || null, error: mockData[table] ? null : new Error('Row not found') };
          },
          maybeSingle: async () => {
            if (table === 'matter_readiness_checks') {
              const check = mockDataSets['matter_readiness_checks']?.[0] || mockData['matter_readiness_checks'];
              return { data: check || null, error: null };
            }
            if (table === 'document_extractions') {
              return { data: { id: 'mock-ext-1', document_id: 'mock-doc-2', confidence: 'high', extracted_text: 'Extracted text content' }, error: null };
            }
            const res = await chain.single().catch(() => ({ data: null, error: null }));
            if (res.error) {
              return { data: null, error: null };
            }
            return res;
          },
          order: () => chain,
          limit: () => chain,
          then: (resolve: any) => {
            resolve({ data: mockDataSets[table] || [], error: null });
          }
        };
        return chain;
      },
      storage: {
        from: () => ({
          createSignedUrl: async () => ({ data: { signedUrl: 'https://example.com/mock-file.pdf' }, error: null }),
          upload: async () => ({ data: { path: 'mock-path' }, error: null }),
          remove: async () => ({ data: [], error: null })
        })
      }
    };
    return mockChain as any;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'System configuration error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in the server environment.'
    );
  }

  return createServerClient(
    url,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}

function getMockDocuments() {
  return [
    {
      id: 'mock-doc-1',
      title: 'Summons and Particulars of Claim',
      is_privileged: false,
      status: 'uploaded',
      confidentiality_level: 'standard',
      category: 'Pleading',
      document_type: 'application/pdf',
      ai_processed: false,
      approval_status: 'pending',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      matters: { id: 'mock-matter-1', title: 'Sipho Nkosi Divorce', case_number: '12345/26' },
      document_versions: [
        {
          id: 'mock-ver-1',
          version_number: 1,
          file_name: 'summons.pdf',
          file_size: 102400,
          mime_type: 'application/pdf',
          classification: 'Pleading',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          storage_path: 'mock-firm-uuid/mock-matter-1/mock-ver-1.pdf'
        }
      ],
      document_ai_summaries: []
    },
    {
      id: 'mock-doc-2',
      title: 'Client Interview Notes',
      is_privileged: true,
      status: 'review_pending',
      confidentiality_level: 'confidential',
      category: 'Internal Memo',
      document_type: 'application/pdf',
      ai_processed: true,
      approval_status: 'pending',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      matters: { id: 'mock-matter-1', title: 'Sipho Nkosi Divorce', case_number: '12345/26' },
      document_versions: [
        {
          id: 'mock-ver-2',
          version_number: 1,
          file_name: 'interview_notes.pdf',
          file_size: 204800,
          mime_type: 'application/pdf',
          classification: 'Internal Memo',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          storage_path: 'mock-firm-uuid/mock-matter-1/mock-ver-2.pdf'
        }
      ],
      document_ai_summaries: [
        {
          id: 'mock-summary-2',
          output_title: 'Placeholder Document Summary',
          summary_text: 'This is a placeholder document summary generated for workflow validation. Live AI extraction is not enabled yet.',
          sources_used: [
            {
              document_id: 'mock-doc-2',
              title: 'Client Interview Notes',
              filename: 'interview_notes.pdf',
              category: 'Internal Memo',
              generated_at: new Date(Date.now() - 7100000).toISOString()
            }
          ],
          confidence_level: 'low',
          missing_information: 'Live document extraction is not yet enabled. Review the document manually before relying on this summary.',
          suggested_next_action: 'Review document manually and approve metadata classification.',
          approval_status: 'pending',
          created_at: new Date(Date.now() - 7100000).toISOString()
        }
      ]
    },
    {
      id: 'mock-doc-3',
      title: 'Opposing Counsel Notice of Defend',
      is_privileged: false,
      status: 'approved',
      confidentiality_level: 'restricted',
      category: 'Correspondence',
      document_type: 'application/pdf',
      ai_processed: true,
      approval_status: 'approved',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      matters: { id: 'mock-matter-1', title: 'Sipho Nkosi Divorce', case_number: '12345/26' },
      document_versions: [
        {
          id: 'mock-ver-3',
          version_number: 1,
          file_name: 'opposing_notice.pdf',
          file_size: 153600,
          mime_type: 'application/pdf',
          classification: 'Correspondence',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          storage_path: 'mock-firm-uuid/mock-matter-1/mock-ver-3.pdf'
        }
      ],
      document_ai_summaries: [
        {
          id: 'mock-summary-3',
          output_title: 'Approved Document Summary',
          summary_text: 'The opposing party intends to defend the action. Case trial preparations should proceed.',
          sources_used: [],
          confidence_level: 'high',
          missing_information: 'None.',
          suggested_next_action: 'Draft Plea and Counterclaim.',
          approval_status: 'approved',
          created_at: new Date(Date.now() - 86300000).toISOString()
        }
      ]
    }
  ];
}

export function createAdminClient() {
  return createClient();
}
