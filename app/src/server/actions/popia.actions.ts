'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getClientPopiaConsent(clientId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('popia_consents')
    .select(`
      id,
      consented_to_processing,
      consented_channels,
      signed_consent_document_url,
      expires_at,
      created_at,
      updated_at
    `)
    .eq('client_id', clientId)
    .eq('firm_id', auth.firmId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateClientPopiaConsent(
  clientId: string,
  formData: {
    consentedToProcessing: boolean;
    consentedChannels: string[];
    signedConsentUrl?: string;
  }
) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Verify that the client belongs to the user's firm
  const { data: clientExists } = await adminDb
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('firm_id', auth.firmId)
    .maybeSingle();

  if (!clientExists) {
    return { success: false, error: 'Access denied: Client not found.' };
  }

  // Expiration locked to 3 years from today per POPIA guidelines
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 3);

  // Check if consent record exists securely scoped by firm_id
  const { data: existing } = await adminDb
    .from('popia_consents')
    .select('id')
    .eq('client_id', clientId)
    .eq('firm_id', auth.firmId)
    .maybeSingle();

  let error = null;
  if (existing) {
    const { error: err } = await adminDb
      .from('popia_consents')
      .update({
        consented_to_processing: formData.consentedToProcessing,
        consented_channels: formData.consentedChannels,
        signed_consent_document_url: formData.signedConsentUrl || null,
        captured_by: auth.userId,
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', existing.id);
    error = err;
  } else {
    const { error: err } = await adminDb
      .from('popia_consents')
      .insert({
        firm_id: auth.firmId,
        client_id: clientId,
        consented_to_processing: formData.consentedToProcessing,
        consented_channels: formData.consentedChannels,
        signed_consent_document_url: formData.signedConsentUrl || null,
        captured_by: auth.userId,
        expires_at: expiresAt.toISOString(),
      });
    error = err;
  }

  if (error) {
    return { success: false, error: error.message };
  }

  // Write POPIA audit log entry
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'UPDATE_CONSENT',
    resource_type: 'client',
    resource_id: clientId,
    changes: formData,
  });

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: true };
}
