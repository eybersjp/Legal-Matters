'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';

export async function getDashboardStats() {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();
  
  // 1. Fetch counts (scoped by firm_id)
  const { data: matters } = await adminDb.from('matters').select('id').eq('firm_id', auth.firmId);
  const { data: clients } = await adminDb.from('clients').select('id').eq('firm_id', auth.firmId);
  const { data: timeEntries } = await adminDb.from('time_entries').select('duration_minutes, hourly_rate_zar').eq('firm_id', auth.firmId);
  const { data: trust } = await adminDb.from('trust_account_records').select('trust_ledger_balance').eq('firm_id', auth.firmId);

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
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
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
    .eq('firm_id', auth.firmId)
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
  const auth = await requireAuthUser();
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
    .eq('firm_id', auth.firmId)
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
