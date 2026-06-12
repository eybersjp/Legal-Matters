'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getFirmProfile() {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data: firm, error: firmErr } = await adminDb
    .from('firms')
    .select('*')
    .eq('id', auth.firmId)
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
    .eq('firm_id', auth.firmId);

  if (memErr) throw new Error(memErr.message);

  return { firm, members };
}

export async function updateFirmDetails(formData: { name: string; vatNumber: string | null }) {
  const auth = await requireAuthUser();
  if (auth.role !== 'Partner') {
    return { success: false, error: 'Unauthorized: Only Partners can update firm configurations.' };
  }

  const adminDb = createAdminClient();

  const { error } = await adminDb
    .from('firms')
    .update({ name: formData.name, vat_number: formData.vatNumber })
    .eq('id', auth.firmId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Create audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'UPDATE_FIRM_PROFILE',
    resource_type: 'firm',
    resource_id: auth.firmId,
    changes: { name: formData.name, vat_number: formData.vatNumber },
  });

  revalidatePath('/dashboard/firm');
  return { success: true };
}
