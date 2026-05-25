'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getMatterDocuments(matterId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      is_privileged,
      document_versions (
        id,
        version_number,
        file_name,
        file_size,
        mime_type,
        classification,
        created_at
      )
    `)
    .eq('matter_id', matterId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((doc: any) => ({
    id: doc.id,
    title: doc.title,
    is_privileged: doc.is_privileged,
    versions: doc.document_versions || [],
    latest: doc.document_versions?.[0] || null,
  }));
}

export async function registerDocumentUpload(formData: {
  matterId: string;
  title: string;
  isPrivileged: boolean;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  classification: 'Pleading' | 'Evidence' | 'Correspondence' | 'Internal Memo' | 'Precedent';
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthenticated.' };

  const firmId = user.user_metadata?.firm_id;

  // 1. Create Document Entry
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      firm_id: firmId,
      matter_id: formData.matterId,
      title: formData.title,
      is_privileged: formData.isPrivileged,
    })
    .select('id')
    .single();

  if (docErr) return { success: false, error: docErr.message };

  // 2. Create Document Version 1 Entry
  const { error: verErr } = await supabase
    .from('document_versions')
    .insert({
      firm_id: firmId,
      document_id: doc.id,
      version_number: 1,
      storage_path: formData.storagePath,
      file_name: formData.fileName,
      file_size: formData.fileSize,
      mime_type: formData.mimeType,
      classification: formData.classification,
      uploaded_by: user.id,
    });

  if (verErr) {
    // Teardown document
    await supabase.from('documents').delete().eq('id', doc.id);
    return { success: false, error: verErr.message };
  }

  // 3. Create unalterable audit log
  const adminDb = createAdminClient();
  await adminDb.from('audit_logs').insert({
    firm_id: firmId,
    user_id: user.id,
    action: 'UPLOAD_DOCUMENT',
    resource_type: 'document',
    resource_id: doc.id,
    changes: formData,
  });

  revalidatePath(`/dashboard/matters/${formData.matterId}/documents`);
  return { success: true };
}

export async function getDocumentDownloadUrl(documentId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated.');

  // RLS will automatically throw error if user has no access to this document
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, is_privileged, document_versions(storage_path)')
    .eq('id', documentId)
    .single();

  if (docErr) throw new Error(docErr.message);

  const storagePath = doc.document_versions?.[0]?.storage_path;
  if (!storagePath) throw new Error('File version reference not found.');

  // Generate temporary signed download link from Supabase Storage
  const { data: signed, error: storageErr } = await supabase
    .storage
    .from('legal-matters-docs')
    .createSignedUrl(storagePath, 300); // valid for 5 minutes

  if (storageErr) throw new Error(storageErr.message);

  // Write Access Log per POPIA guidelines
  const firmId = user.user_metadata?.firm_id;
  const adminDb = createAdminClient();
  await adminDb.from('document_access_logs').insert({
    firm_id: firmId,
    document_id: documentId,
    member_id: user.id,
    action: 'DOWNLOAD',
  });

  return signed.signedUrl;
}

export async function getAllDocuments() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated user.');

  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      is_privileged,
      created_at,
      matters (
        id,
        title,
        case_number
      ),
      document_versions (
        id,
        version_number,
        file_name,
        file_size,
        mime_type,
        classification,
        created_at
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((doc: any) => ({
    id: doc.id,
    title: doc.title,
    is_privileged: doc.is_privileged,
    created_at: doc.created_at,
    matter: doc.matters || null,
    versions: doc.document_versions || [],
    latest: doc.document_versions?.[0] || null,
  }));
}

