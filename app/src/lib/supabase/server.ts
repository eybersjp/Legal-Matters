import { createServerClient } from '@supabase/ssr';

/**
 * Creates a Supabase client with service role privileges for database operations.
 * Since Clerk handles authentication, this client bypasses RLS.
 * Auth verification is done via Clerk's auth() in each server action.
 */
export function createClient() {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    const mockChain: any = {
      from: (table: string) => {
        const chain: any = {
          select: () => chain,
          insert: () => chain,
          update: () => chain,
          delete: () => chain,
          eq: () => chain,
          gte: () => chain,
          in: () => chain,
          single: async () => {
            const mockData: Record<string, any> = {
              clients: { id: 'mock-client-id', type: 'Individual', first_name: 'Sipho', last_name: 'Nkosi', sa_id_number: '9201015678087', email: 'sipho@nkosi.co.za', phone_number: '+27831234567' },
              matters: { id: 'mock-matter-id', title: 'Sipho Nkosi Divorce', case_number: '12345/26', status: 'Intake' },
              firms: { id: 'mock-firm-uuid', name: 'Test Firm' },
              firm_members: { id: 'mock-user-uuid', firm_id: 'mock-firm-uuid', role: 'Partner' },
              invoices: { id: 'mock-invoice-id', invoice_number: 'INV-00000001', total_including_vat: 15000 },
            };
            return { data: mockData[table] || {}, error: null };
          },
          order: () => chain,
          limit: () => chain,
          then: (resolve: any) => {
            const mockDataSets: Record<string, any[]> = {
              clients: [{ id: 'mock-client-1', type: 'Individual', first_name: 'Sipho', last_name: 'Nkosi', sa_id_number: '9201015678087', email: 'sipho@nkosi.co.za', phone_number: '+27831234567', created_at: new Date().toISOString() }],
              matters: [{ id: 'mock-matter-1', title: 'Sipho Nkosi Divorce', case_number: '12345/26', status: 'Intake', created_at: new Date().toISOString() }],
              documents: getMockDocuments(),
              notifications: [{ id: 'mock-notif-1', title: 'Pleading Deadline', message: 'Notice of Intention to Defend due in 2 days.', is_read: false, link_url: '/dashboard/deadlines', created_at: new Date().toISOString() }],
              matter_deadlines: [{ id: 'mock-deadline-1', title: 'Plea Due', calculated_deadline: new Date(Date.now() + 86400000 * 2).toISOString(), matters: { id: 'mock-matter-1', title: 'Sipho Nkosi Divorce', case_number: '12345/26' } }],
              audit_logs: [{ id: 'mock-audit-1', action: 'READ_PII', resource_type: 'client', created_at: new Date().toISOString(), user_id: 'mock-user-uuid' }],
              user_profiles: [{ member_id: 'mock-user-uuid', first_name: 'Sipho', last_name: 'Nkosi', firm_members: { id: 'mock-user-uuid', firm_id: 'mock-firm-uuid' } }],
              invoices: [{ id: 'mock-invoice-1', invoice_number: 'INV-00000001', total_including_vat: 15000, status: 'Issued', due_date: new Date().toISOString(), clients: { first_name: 'Sipho', last_name: 'Nkosi' }, matters: { title: 'Sipho Nkosi Divorce' } }],
              popia_consents: [{ id: 'mock-consent-1', client_id: 'mock-client-id', consented_to_processing: true, expires_at: new Date(Date.now() + 5 * 365 * 86400000).toISOString() }],
            };
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

  return createAdminClient();
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
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    const mockChain: any = {
      from: (table: string) => {
        let currentId = '';
        const chain: any = {
          select: () => chain,
          insert: () => chain,
          update: () => chain,
          delete: () => chain,
          eq: (col: string, val: string) => {
            if (col === 'id' || col === 'member_id' || col === 'user_id' || col === 'document_id') {
              currentId = val;
            }
            return chain;
          },
          gte: () => chain,
          in: () => chain,
          order: () => chain,
          limit: () => chain,
          single: async () => {
            if (table === 'firm_members') {
              if (currentId === 'mock-user-no-firm-uuid') {
                return { data: null, error: { message: 'Row not found' } };
              }
              return { data: { id: 'mock-user-uuid', firm_id: 'mock-firm-uuid', role: 'Partner' }, error: null };
            }
            if (table === 'documents') {
              const docs = getMockDocuments();
              const d = docs.find(item => item.id === currentId) || docs[0];
              return { data: d, error: null };
            }
            if (table === 'document_ai_summaries') {
              const docs = getMockDocuments();
              const summaries = docs.flatMap(d => d.document_ai_summaries);
              const s = summaries.find(item => item?.id === currentId) || summaries[1];
              return { data: { ...s, document_id: 'mock-doc-2', matter_id: 'mock-matter-1', firm_id: 'mock-firm-uuid' }, error: null };
            }
            const mockData: Record<string, any> = {
              clients: { id: 'mock-client-1', type: 'Individual', first_name: 'Sipho', last_name: 'Nkosi', sa_id_number: '9201015678087', email: 'sipho@nkosi.co.za', phone_number: '+27831234567' },
              matters: { id: 'mock-matter-1', title: 'Sipho Nkosi Divorce', case_number: '12345/26', status: 'Intake', client_id: 'mock-client-1' },
              firms: { id: 'mock-firm-uuid', name: 'Test Firm' },
              firm_members: { id: 'mock-user-uuid', firm_id: 'mock-firm-uuid', role: 'Partner' },
              invoices: { id: 'mock-invoice-1', invoice_number: 'INV-00000001', total_including_vat: 15000 },
              popia_consents: { id: 'mock-consent-1', client_id: 'mock-client-id', consented_to_processing: true, expires_at: new Date(Date.now() + 5 * 365 * 86400000).toISOString() },
            };
            return { data: mockData[table] || {}, error: null };
          },
          then: (resolve: any) => {
            const mockDataSets: Record<string, any[]> = {
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
              ]
            };
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
