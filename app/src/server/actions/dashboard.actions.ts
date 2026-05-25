'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function getDashboardStats() {
  const supabase = createClient();
  
  // 1. Fetch counts (scoped by RLS automatically)
  const { data: matters } = await supabase.from('matters').select('id');
  const { data: clients } = await supabase.from('clients').select('id');
  const { data: timeEntries } = await supabase.from('time_entries').select('duration_minutes, hourly_rate_zar');
  const { data: trust } = await supabase.from('trust_account_records').select('trust_ledger_balance');

  const totalMatters = matters?.length || 0;
  const totalClients = clients?.length || 0;
  
  // Compute billable ZAR
  let totalBillableZar = 0;
  timeEntries?.forEach((e: any) => {
    totalBillableZar += (e.duration_minutes / 60) * e.hourly_rate_zar;
  });

  // Compute trust balance ZAR
  const totalTrustZar = trust?.reduce((sum: number, r: any) => sum + Number(r.trust_ledger_balance), 0) || 0;

  return {
    totalMatters,
    totalClients,
    totalBillableZar,
    totalTrustZar,
  };
}

export async function getUpcomingDeadlines() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('matter_deadlines')
    .select(`
      id,
      title,
      calculated_deadline,
      matters (
        id,
        title,
        case_number
      )
    `)
    .gte('calculated_deadline', new Date().toISOString())
    .order('calculated_deadline', { ascending: true })
    .limit(5);

  if (error) throw new Error(error.message);

  return data.map((d: any) => ({
    id: d.id,
    title: d.title,
    deadline: d.calculated_deadline,
    matterTitle: d.matters?.title,
    caseNumber: d.matters?.case_number,
  }));
}

export async function getRecentAuditLogs() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated.');

  // RLS allows viewing of own firm's audit logs. We use admin client to resolve profile name cleanly.
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from('audit_logs')
    .select(`
      id,
      action,
      resource_type,
      created_at,
      user_id
    `)
    .eq('firm_id', user.user_metadata?.firm_id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw new Error(error.message);

  // Fetch profiles for the user ids in the logs
  const userIds = Array.from(new Set(data.map((log: any) => log.user_id).filter(Boolean)));
  const profilesMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await adminDb
      .from('user_profiles')
      .select('first_name, last_name, firm_members!inner(id)')
      .in('firm_members.id', userIds);

    profiles?.forEach((p: any) => {
      profilesMap[p.firm_members.id] = `${p.first_name} ${p.last_name}`;
    });
  }

  return data.map((log: any) => ({
    id: log.id,
    action: log.action,
    resource: log.resource_type,
    created_at: log.created_at,
    actor: profilesMap[log.user_id] || 'System',
  }));
}
