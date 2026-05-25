'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper to resolve the active client context for the authenticated portal user
export async function getPortalClientContext() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminDb = createAdminClient();
  const { data: portalAccess, error } = await adminDb
    .from('client_portal_access')
    .select('client_id, firm_id, is_enabled')
    .eq('portal_user_id', user.id)
    .single();

  if (error || !portalAccess || !portalAccess.is_enabled) {
    return null;
  }

  // Update last accessed time for audit/security purposes
  await adminDb
    .from('client_portal_access')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('portal_user_id', user.id);

  return {
    clientId: portalAccess.client_id,
    firmId: portalAccess.firm_id,
    userId: user.id,
  };
}

export async function getPortalMatters() {
  const context = await getPortalClientContext();
  if (!context) throw new Error('Unauthorized portal access.');

  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from('matters')
    .select('id, title, case_number, status, description, created_at')
    .eq('client_id', context.clientId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getPortalInvoices() {
  const context = await getPortalClientContext();
  if (!context) throw new Error('Unauthorized portal access.');

  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from('invoices')
    .select('id, invoice_number, total_including_vat, status, due_date')
    .eq('client_id', context.clientId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getPortalDocuments(matterId: string) {
  const context = await getPortalClientContext();
  if (!context) throw new Error('Unauthorized portal access.');

  const adminDb = createAdminClient();
  
  // Strict Security Policy: client portal must NEVER fetch is_privileged = true documents.
  const { data, error } = await adminDb
    .from('documents')
    .select(`
      id,
      title,
      created_at,
      document_versions (
        version_number,
        file_name,
        file_size,
        storage_path,
        classification
      )
    `)
    .eq('matter_id', matterId)
    .eq('is_privileged', false)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((doc: any) => {
    const latestVersion = doc.document_versions?.[0] || null;
    return {
      id: doc.id,
      title: doc.title,
      created_at: doc.created_at,
      fileName: latestVersion?.file_name || 'No file uploaded',
      fileSize: latestVersion?.file_size || 0,
      storagePath: latestVersion?.storage_path || '',
      classification: latestVersion?.classification || 'Correspondence',
    };
  });
}

export async function getPortalPOPIAConsent() {
  const context = await getPortalClientContext();
  if (!context) throw new Error('Unauthorized portal access.');

  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from('popia_consents')
    .select('*')
    .eq('client_id', context.clientId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return data || null;
}

export async function togglePortalPOPIAConsent(consented: boolean) {
  const context = await getPortalClientContext();
  if (!context) return { success: false, error: 'Unauthorized portal access.' };

  const adminDb = createAdminClient();

  // Standard 5-year consent expiry
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 5);

  // Check if consent record already exists
  const { data: existing } = await adminDb
    .from('popia_consents')
    .select('id')
    .eq('client_id', context.clientId)
    .single();

  let consentId = '';

  if (existing) {
    const { data: updated, error } = await adminDb
      .from('popia_consents')
      .update({
        consented_to_processing: consented,
        expires_at: expiry.toISOString(),
      })
      .eq('client_id', context.clientId)
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    consentId = updated.id;
  } else {
    const { data: inserted, error } = await adminDb
      .from('popia_consents')
      .insert({
        firm_id: context.firmId,
        client_id: context.clientId,
        consented_to_processing: consented,
        consented_channels: ['Email', 'SMS'],
        captured_by: context.userId, // Captured by self in portal
        expires_at: expiry.toISOString(),
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    consentId = inserted.id;
  }

  // Log the audit event for client consent modification (POPIA statutory mandate)
  await adminDb.from('audit_logs').insert({
    firm_id: context.firmId,
    user_id: context.userId,
    action: consented ? 'POPIA_CONSENT_GRANTED' : 'POPIA_CONSENT_REVOKED',
    resource_type: 'popia_consents',
    resource_id: consentId,
    changes: { consented_to_processing: consented, source: 'client_portal' },
  });

  revalidatePath('/portal');
  return { success: true };
}

export async function getPortalDocumentDownloadUrl(documentId: string) {
  const context = await getPortalClientContext();
  if (!context) throw new Error('Unauthorized portal access.');

  const adminDb = createAdminClient();

  // Strict check: make sure the document exists, belongs to client's matter, and is NOT privileged!
  const { data: doc, error } = await adminDb
    .from('documents')
    .select(`
      id,
      is_privileged,
      matter_id,
      matters (
        client_id
      ),
      document_versions (
        storage_path
      )
    `)
    .eq('id', documentId)
    .single();

  if (error || !doc) throw new Error('Document not found.');
  const docAny = doc as any;
  if (docAny.is_privileged) throw new Error('Access denied: privileged legal document.');
  if (docAny.matters?.client_id !== context.clientId) throw new Error('Access denied: unauthorized matter folder.');

  const storagePath = docAny.document_versions?.[0]?.storage_path;
  if (!storagePath) throw new Error('File storage reference not found.');

  const { data: signed, error: storageErr } = await adminDb
    .storage
    .from('legal-matters-docs')
    .createSignedUrl(storagePath, 300);

  if (storageErr) throw new Error(storageErr.message);

  // Write Access Log per POPIA guidelines
  await adminDb.from('document_access_logs').insert({
    firm_id: context.firmId,
    document_id: documentId,
    member_id: null,
    action: 'PORTAL_DOWNLOAD',
  });

  return signed.signedUrl;
}
