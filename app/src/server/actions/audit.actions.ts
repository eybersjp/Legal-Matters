'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';

export async function getSystemAuditLogs() {
  const auth = await requireAuthUser();
  if (auth.role !== 'Partner') {
    throw new Error('Unauthorized Access: Audit logs are strictly quarantined to Partners only.');
  }

  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from('audit_logs')
    .select(`
      id,
      action,
      resource_type,
      resource_id,
      changes,
      ip_address,
      user_agent,
      created_at,
      user_id
    `)
    .eq('firm_id', auth.firmId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const userIds = Array.from(new Set(data.map((log: any) => log.user_id).filter(Boolean)));
  const profilesMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await adminDb
      .from('user_profiles')
      .select('first_name, last_name, firm_members!inner(id, firm_id)')
      .in('firm_members.id', userIds)
      .eq('firm_members.firm_id', auth.firmId);

    profiles?.forEach((p: any) => {
      profilesMap[p.firm_members.id] = `${p.first_name} ${p.last_name}`;
    });
  }

  return data.map((log: any) => ({
    id: log.id,
    action: log.action,
    resource: log.resource_type,
    resourceId: log.resource_id,
    changes: log.changes,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    created_at: log.created_at,
    userName: profilesMap[log.user_id] || 'System / trigger',
  }));
}
