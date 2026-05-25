import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    const isAuthenticated = cookieStore.get('mock-authenticated')?.value === 'true';
    
    return {
      auth: {
        getUser: async () => {
          if (!isAuthenticated) return { data: { user: null }, error: null };
          return {
            data: {
              user: {
                id: 'mock-user-uuid',
                email: 'partner@example.com',
                user_metadata: {
                  firm_id: 'mock-firm-uuid',
                  role: 'Partner'
                }
              }
            },
            error: null
          };
        },
        signInWithPassword: async ({ email, password }: any) => {
          if (email === 'fail@example.com' || password === 'wrong') {
            return { error: { message: 'Invalid credentials' }, data: { user: null } };
          }
          return {
            data: {
              user: {
                id: 'mock-user-uuid',
                email: email,
                user_metadata: {
                  firm_id: 'mock-firm-uuid',
                  role: 'Partner'
                }
              }
            },
            error: null
          };
        },
        signUp: async ({ email }: any) => {
          return {
            data: {
              user: {
                id: 'mock-user-uuid',
                email: email,
                user_metadata: {
                  firm_id: 'mock-firm-uuid',
                  role: 'Partner'
                }
              }
            },
            error: null
          };
        },
        signOut: async () => {
          return { error: null };
        }
      },
      storage: {
        from: () => ({
          createSignedUrl: async () => ({ data: { signedUrl: 'https://example.com/mock-file.pdf' }, error: null })
        })
      },
      from: (table: string) => {
        const mockChain = {
          select: () => mockChain,
          insert: () => mockChain,
          update: () => mockChain,
          delete: () => mockChain,
          eq: () => mockChain,
          gte: () => mockChain,
          single: async () => {
            if (table === 'clients') {
              return { 
                data: { 
                  id: 'mock-client-id', 
                  type: 'Individual',
                  first_name: 'Sipho', 
                  last_name: 'Nkosi', 
                  sa_id_number: '9201015678087', 
                  email: 'sipho@nkosi.co.za', 
                  phone_number: '+27831234567' 
                }, 
                error: null 
              };
            }
            if (table === 'matters') {
              return {
                data: {
                  id: 'mock-matter-id',
                  title: 'Sipho Nkosi Divorce',
                  case_number: '12345/26',
                  status: 'Intake'
                },
                error: null
              };
            }
            return { data: {}, error: null };
          },
          order: () => mockChain,
          limit: () => mockChain,
          then: (resolve: any) => {
            let mockData: any = [];
            if (table === 'clients') {
              mockData = [
                { id: 'mock-client-1', type: 'Individual', first_name: 'Sipho', last_name: 'Nkosi', sa_id_number: '9201015678087', email: 'sipho@nkosi.co.za', phone_number: '+27831234567', created_at: new Date().toISOString() }
              ];
            } else if (table === 'matters') {
              mockData = [
                { id: 'mock-matter-1', title: 'Sipho Nkosi Divorce', case_number: '12345/26', status: 'Intake', created_at: new Date().toISOString() }
              ];
            } else if (table === 'documents') {
              mockData = [
                {
                  id: 'mock-doc-1',
                  title: 'Summons and Particulars of Claim',
                  is_privileged: false,
                  created_at: new Date().toISOString(),
                  matters: { id: 'mock-matter-1', title: 'Sipho Nkosi Divorce', case_number: '12345/26' },
                  document_versions: [
                    { id: 'mock-ver-1', file_name: 'summons.pdf', file_size: 102400, mime_type: 'application/pdf', classification: 'Pleading', created_at: new Date().toISOString() }
                  ]
                }
              ];
            } else if (table === 'notifications') {
              mockData = [
                { id: 'mock-notif-1', title: 'Pleading Deadline', message: 'Notice of Intention to Defend due in 2 days.', is_read: false, link_url: '/dashboard/deadlines', created_at: new Date().toISOString() }
              ];
            } else if (table === 'matter_deadlines') {
              mockData = [
                { id: 'mock-deadline-1', title: 'Plea Due', calculated_deadline: new Date(Date.now() + 86400000 * 2).toISOString(), matters: { id: 'mock-matter-1', title: 'Sipho Nkosi Divorce', case_number: '12345/26' } }
              ];
            } else if (table === 'audit_logs') {
              mockData = [
                { id: 'mock-audit-1', action: 'READ_PII', resource_type: 'client', created_at: new Date().toISOString(), user_id: 'mock-user-uuid' }
              ];
            }
            resolve({ data: mockData, error: null });
          }
        };
        return mockChain as any;
      }
    } as any;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored from server components
          }
        },
      },
    }
  );
}

export function createAdminClient() {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    return {
      from: () => ({
        insert: async () => ({ error: null }),
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: [], error: null })
            })
          })
        })
      })
    } as any;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
