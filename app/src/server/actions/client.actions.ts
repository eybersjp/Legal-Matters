'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { CreateClientSchema } from '@/schemas';
import { revalidatePath } from 'next/cache';

export async function getClientsList() {
  const { firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('clients')
    .select('*')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data;
}

export async function getClientDetails(clientId: string) {
  const { userId, firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data: client, error } = await adminDb
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('firm_id', firmId)
    .single();

  if (error) throw new Error(error.message);

  // Write read audit log for PII access (POPIA statutory mandate)
  await adminDb.from('audit_logs').insert({
    firm_id: firmId,
    user_id: userId,
    action: 'READ_PII',
    resource_type: 'client',
    resource_id: clientId,
    changes: {
      accessed_fields: ['sa_id_number', 'phone_number', 'email', 'company_name', 'first_name', 'last_name'],
      source: 'client_profile_view',
    },
  });

  return client;
}

export async function addClient(formData: any) {
  const parsed = CreateClientSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { userId, firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('clients')
    .insert({
      firm_id: firmId,
      type: parsed.data.type,
      company_name: parsed.data.company_name || null,
      registration_number: parsed.data.registration_number || null,
      first_name: parsed.data.first_name || null,
      last_name: parsed.data.last_name || null,
      sa_id_number: parsed.data.sa_id_number || null,
      passport_number: parsed.data.passport_number || null,
      email: parsed.data.email,
      phone_number: parsed.data.phone_number,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Create audit log for PII modification
  await adminDb.from('audit_logs').insert({
    firm_id: firmId,
    user_id: userId,
    action: 'CREATE_CLIENT_PII',
    resource_type: 'client',
    resource_id: data.id,
    changes: parsed.data,
  });

  revalidatePath('/dashboard/clients');
  return { success: true };
}
