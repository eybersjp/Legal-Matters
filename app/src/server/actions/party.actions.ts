'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getPartiesList() {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('parties')
    .select('*')
    .eq('firm_id', auth.firmId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data;
}

export async function addParty(formData: {
  type: 'Individual' | 'Corporate';
  company_name?: string;
  first_name?: string;
  last_name?: string;
  sa_id_number?: string;
  email?: string;
  phone_number?: string;
}) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();
  
  if (formData.sa_id_number) {
    const { data: conflictClient } = await adminDb
      .from('clients')
      .select('id, first_name, last_name, company_name')
      .eq('sa_id_number', formData.sa_id_number)
      .eq('firm_id', auth.firmId)
      .maybeSingle();

    if (conflictClient) {
      const name = conflictClient.company_name || `${conflictClient.first_name} ${conflictClient.last_name}`;
      return { 
        success: false, 
        conflictDetected: true,
        error: `CONFLICT OF INTEREST DETECTED: This individual is already registered as an active client of the firm (${name}). You cannot represent opposing parties in this matter.` 
      };
    }
  }

  // 2. Insert Party record
  const { error } = await adminDb
    .from('parties')
    .insert({
      firm_id: auth.firmId,
      type: formData.type,
      company_name: formData.company_name || null,
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      sa_id_number: formData.sa_id_number || null,
      email: formData.email || null,
      phone_number: formData.phone_number || null,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  // Create audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'CREATE_PARTY_RECORD',
    resource_type: 'party',
    resource_id: '00000000-0000-0000-0000-000000000000', // standard fallback UUID
    changes: formData,
  });

  revalidatePath('/dashboard/parties');
  return { success: true };
}
