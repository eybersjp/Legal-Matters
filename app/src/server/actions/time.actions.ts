'use server';

import { createClient } from '@/lib/supabase/server';
import { CreateTimeEntrySchema } from '@/schemas';
import { revalidatePath } from 'next/cache';

export async function getTimeEntriesList() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      id,
      duration_minutes,
      hourly_rate_zar,
      description,
      is_billed,
      created_at,
      matters (
        id,
        title,
        case_number
      ),
      firm_members (
        user_profiles (
          first_name,
          last_name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((entry: any) => ({
    id: entry.id,
    duration: entry.duration_minutes,
    rate: entry.hourly_rate_zar,
    description: entry.description,
    isBilled: entry.is_billed,
    created_at: entry.created_at,
    matter_title: entry.matters?.title,
    case_number: entry.matters?.case_number,
    fee_earner: entry.firm_members?.[0]?.user_profiles?.[0]
      ? `${entry.firm_members[0].user_profiles[0].first_name} ${entry.firm_members[0].user_profiles[0].last_name}`
      : 'Unknown',
  }));
}

export async function recordTimeEntry(formData: any) {
  const parsed = CreateTimeEntrySchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthenticated.' };

  const firmId = user.user_metadata?.firm_id;

  const { error } = await supabase
    .from('time_entries')
    .insert({
      firm_id: firmId,
      matter_id: parsed.data.matter_id,
      member_id: user.id,
      duration_minutes: parsed.data.duration_minutes,
      hourly_rate_zar: parsed.data.hourly_rate_zar,
      description: parsed.data.description,
      is_billed: false,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/time');
  return { success: true };
}
