'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getClientPopiaConsent(clientId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthenticated.' };

  const firmId = user.user_metadata?.firm_id;
  const adminDb = createAdminClient();

  // Expiration locked to 3 years from today per POPIA guidelines
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 3);

  // Check if consent record exists
  const { data: existing } = await adminDb
    .from('popia_consents')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle();

  let error = null;
  if (existing) {
    const { error: err } = await adminDb
      .from('popia_consents')
      .update({
        consented_to_processing: formData.consentedToProcessing,
        consented_channels: formData.consentedChannels,
        signed_consent_document_url: formData.signedConsentUrl || null,
        captured_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', existing.id);
    error = err;
  } else {
    const { error: err } = await adminDb
      .from('popia_consents')
      .insert({
        firm_id: firmId,
        client_id: clientId,
        consented_to_processing: formData.consentedToProcessing,
        consented_channels: formData.consentedChannels,
        signed_consent_document_url: formData.signedConsentUrl || null,
        captured_by: user.id,
        expires_at: expiresAt.toISOString(),
      });
    error = err;
  }

  if (error) {
    return { success: false, error: error.message };
  }

  // Write POPIA audit log entry
  await adminDb.from('audit_logs').insert({
    firm_id: firmId,
    user_id: user.id,
    action: 'UPDATE_CONSENT',
    resource_type: 'client',
    resource_id: clientId,
    changes: formData,
  });

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: true };
}
