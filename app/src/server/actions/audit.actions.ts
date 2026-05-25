'use server';

import { createClient } from '@/lib/supabase/server';

export async function getSystemAuditLogs() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'Partner') {
    throw new Error('Unauthorized Access: Audit logs are strictly quarantined to Partners only.');
  }

  const { data, error } = await supabase
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
      users (
        email,
        user_profiles (
          first_name,
          last_name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((log: any) => ({
    id: log.id,
    action: log.action,
    resource: log.resource_type,
    resourceId: log.resource_id,
    changes: log.changes,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    created_at: log.created_at,
    userName: log.users?.user_profiles?.[0]
      ? `${log.users.user_profiles[0].first_name} ${log.users.user_profiles[0].last_name}`
      : log.users?.email || 'System / trigger',
  }));
}
