'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getFirmProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated user.');

  const firmId = user.user_metadata?.firm_id;
  const adminDb = createAdminClient();

  const { data: firm, error: firmErr } = await adminDb
    .from('firms')
    .select('*')
    .eq('id', firmId)
    .single();

  if (firmErr) throw new Error(firmErr.message);

  const { data: members, error: memErr } = await adminDb
    .from('firm_members')
    .select(`
      id,
      role,
      is_active,
      user_profiles (
        first_name,
        last_name,
        phone_number
      )
    `)
    .eq('firm_id', firmId);

  if (memErr) throw new Error(memErr.message);

  return { firm, members };
}

export async function updateFirmDetails(formData: { name: string; vatNumber: string | null }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'Partner') {
    return { success: false, error: 'Unauthorized: Only Partners can update firm configurations.' };
  }

  const firmId = user.user_metadata?.firm_id;
  const adminDb = createAdminClient();

  const { error } = await adminDb
    .from('firms')
    .update({
      name: formData.name,
      vat_number: formData.vatNumber,
    })
    .eq('id', firmId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Create audit log
  await adminDb.from('audit_logs').insert({
    firm_id: firmId,
    user_id: user.id,
    action: 'UPDATE_FIRM_PROFILE',
    resource_type: 'firm',
    resource_id: firmId,
    changes: { name: formData.name, vat_number: formData.vatNumber },
  });

  revalidatePath('/dashboard/firm');
  return { success: true };
}
