'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getMatterTimeline(matterId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('matter_events')
    .select(`
      id,
      title,
      description,
      event_date,
      created_at,
      firm_members (
        user_profiles (
          first_name,
          last_name
        )
      )
    `)
    .eq('matter_id', matterId)
    .eq('firm_id', auth.firmId)
    .order('event_date', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    event_date: item.event_date,
    created_at: item.created_at,
    creator_name: item.firm_members?.[0]?.user_profiles?.[0]
      ? `${item.firm_members[0].user_profiles[0].first_name} ${item.firm_members[0].user_profiles[0].last_name}`
      : 'System',
  }));
}

export async function addTimelineEvent(formData: {
  matterId: string;
  title: string;
  description?: string;
  eventDate: string;
}) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { error } = await adminDb
    .from('matter_events')
    .insert({
      firm_id: auth.firmId,
      matter_id: formData.matterId,
      title: formData.title,
      description: formData.description || null,
      event_date: formData.eventDate,
      created_by: auth.userId,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/matters/${formData.matterId}`);
  return { success: true };
}
