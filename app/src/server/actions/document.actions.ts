'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

function deriveExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'application/pdf':
      return '.pdf';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '.docx';
    case 'image/png':
      return '.png';
    case 'image/jpeg':
      return '.jpg';
    case 'text/plain':
      return '.txt';
    default:
      return '.bin';
  }
}

export async function uploadDocument(formData: FormData) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const file = formData.get('file');
  const matterId = formData.get('matterId') as string;
  const title = formData.get('title') as string;
  const classification = formData.get('classification') as any;
  const confidentiality = (formData.get('confidentiality') || 'standard') as any;
  const isPrivileged = formData.get('isPrivileged') === 'true';

  if (!matterId) return { success: false, error: 'Matter ID is required.' };
  if (!title) return { success: false, error: 'Title is required.' };
  if (!(file instanceof File)) {
    return { success: false, error: 'Document file is required.' };
  }

  // Matter ownership check
  const { data: matter, error: matterError } = await adminDb
    .from('matters')
    .select('id, firm_id, client_id, title, case_number')
    .eq('id', matterId)
    .eq('firm_id', auth.firmId)
    .single();

  if (matterError || !matter) {
    return { success: false, error: 'Access denied: Matter not found or firm mismatch.' };
  }

  // Validate file
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'text/plain'
  ];

  if (!allowedMimeTypes.includes(file.type)) {
    return { success: false, error: `Invalid file type: ${file.type}. Allowed types: PDF, DOCX, PNG, JPG, TXT.` };
  }

  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxBytes) {
    return { success: false, error: 'File size exceeds the 5MB limit.' };
  }

  // Safe file name and path
  const docId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${auth.firmId}/${matterId}/${docId}/${versionId}/${safeFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage
  const { error: storageError } = await adminDb.storage
    .from('legal-matters-docs')
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false
    });

  if (storageError) {
    return { success: false, error: `Storage upload failed: ${storageError.message}` };
  }

  // Insert document row
  const { data: doc, error: docError } = await adminDb
    .from('documents')
    .insert({
      id: docId,
      firm_id: auth.firmId,
      matter_id: matterId,
      title: title,
      is_privileged: isPrivileged,
      status: 'uploaded',
      confidentiality_level: confidentiality,
      category: classification,
      document_type: file.type,
      ai_processed: false,
      approval_status: 'pending',
      client_id: matter.client_id
    })
    .select('id')
    .single();

  if (docError) {
    // Attempt cleanup
    await adminDb.storage.from('legal-matters-docs').remove([storagePath]);
    return { success: false, error: `Document creation failed: ${docError.message}` };
  }

  // Insert document version row
  const { error: versionError } = await adminDb
    .from('document_versions')
    .insert({
      id: versionId,
      firm_id: auth.firmId,
      document_id: docId,
      version_number: 1,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      classification: classification,
      uploaded_by: auth.userId
    });

  if (versionError) {
    // Attempt cleanup
    await adminDb.from('documents').delete().eq('id', docId);
    await adminDb.storage.from('legal-matters-docs').remove([storagePath]);
    return { success: false, error: `Version registration failed: ${versionError.message}` };
  }

  // Create document_processing_jobs row
  const { error: jobError } = await adminDb
    .from('document_processing_jobs')
    .insert({
      firm_id: auth.firmId,
      matter_id: matterId,
      document_id: docId,
      document_version_id: versionId,
      job_type: 'extraction',
      status: 'queued',
      created_by: auth.userId
    });

  if (jobError) {
    // Attempt cleanup
    await adminDb.from('document_versions').delete().eq('id', versionId);
    await adminDb.from('documents').delete().eq('id', docId);
    await adminDb.storage.from('legal-matters-docs').remove([storagePath]);
    return { success: false, error: `Processing job registration failed: ${jobError.message}` };
  }

  // Write audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'UPLOAD_DOCUMENT',
    resource_type: 'document',
    resource_id: doc.id,
    changes: {
      title,
      classification,
      confidentiality,
      isPrivileged,
      file_name: file.name,
      file_size: file.size
    }
  });

  // Write timeline event
  await adminDb.from('matter_events').insert({
    firm_id: auth.firmId,
    matter_id: matterId,
    title: 'Document Uploaded',
    description: `Document "${title}" (${file.name}) was uploaded and secured in vault.`,
    event_date: new Date().toISOString(),
    created_by: auth.userId
  });

  revalidatePath(`/dashboard/matters/${matterId}/documents`);
  return { success: true, data: { documentId: doc.id } };
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
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Matter ownership check
  const { data: matter, error: matterError } = await adminDb
    .from('matters')
    .select('id, firm_id, client_id')
    .eq('id', formData.matterId)
    .eq('firm_id', auth.firmId)
    .single();

  if (matterError || !matter) {
    return { success: false, error: 'Access denied: Matter not found or firm mismatch.' };
  }

  // Insert document row
  const { data: doc, error: docErr } = await adminDb
    .from('documents')
    .insert({
      firm_id: auth.firmId,
      matter_id: formData.matterId,
      title: formData.title,
      is_privileged: formData.isPrivileged,
      status: 'uploaded',
      confidentiality_level: 'standard',
      category: formData.classification,
      document_type: formData.mimeType,
      ai_processed: false,
      approval_status: 'pending',
      client_id: matter.client_id
    })
    .select('id')
    .single();

  if (docErr) return { success: false, error: docErr.message };

  const versionId = crypto.randomUUID();
  // Insert Document Version 1 Entry
  const { error: verErr } = await adminDb
    .from('document_versions')
    .insert({
      id: versionId,
      firm_id: auth.firmId,
      document_id: doc.id,
      version_number: 1,
      storage_path: formData.storagePath,
      file_name: formData.fileName,
      file_size: formData.fileSize,
      mime_type: formData.mimeType,
      classification: formData.classification,
      uploaded_by: auth.userId,
    });

  if (verErr) {
    await adminDb.from('documents').delete().eq('id', doc.id);
    return { success: false, error: verErr.message };
  }

  // Create document_processing_jobs row
  const { error: jobError } = await adminDb
    .from('document_processing_jobs')
    .insert({
      firm_id: auth.firmId,
      matter_id: formData.matterId,
      document_id: doc.id,
      document_version_id: versionId,
      job_type: 'extraction',
      status: 'queued',
      created_by: auth.userId
    });

  if (jobError) {
    await adminDb.from('document_versions').delete().eq('id', versionId);
    await adminDb.from('documents').delete().eq('id', doc.id);
    return { success: false, error: `Processing job registration failed: ${jobError.message}` };
  }

  // Create audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'UPLOAD_DOCUMENT',
    resource_type: 'document',
    resource_id: doc.id,
    changes: formData,
  });

  // Write timeline event
  await adminDb.from('matter_events').insert({
    firm_id: auth.firmId,
    matter_id: formData.matterId,
    title: 'Document Uploaded',
    description: `Document "${formData.title}" (${formData.fileName}) was uploaded and secured in vault.`,
    event_date: new Date().toISOString(),
    created_by: auth.userId
  });

  revalidatePath(`/dashboard/matters/${formData.matterId}/documents`);
  return { success: true };
}

export async function listMatterDocuments(matterId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('documents')
    .select(`
      id,
      title,
      is_privileged,
      status,
      confidentiality_level,
      category,
      document_type,
      ai_processed,
      approval_status,
      created_at,
      document_versions (
        id,
        version_number,
        file_name,
        file_size,
        mime_type,
        classification,
        created_at,
        storage_path
      ),
      document_ai_summaries (
        id,
        output_title,
        summary_text,
        sources_used,
        confidence_level,
        missing_information,
        suggested_next_action,
        approval_status,
        created_at
      )
    `)
    .eq('matter_id', matterId)
    .eq('firm_id', auth.firmId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((doc: any) => ({
    id: doc.id,
    title: doc.title,
    is_privileged: doc.is_privileged,
    status: doc.status,
    confidentiality_level: doc.confidentiality_level,
    category: doc.category,
    document_type: doc.document_type,
    ai_processed: doc.ai_processed,
    approval_status: doc.approval_status,
    created_at: doc.created_at,
    versions: doc.document_versions || [],
    latest: doc.document_versions?.sort((a: any, b: any) => b.version_number - a.version_number)[0] || null,
    ai_summary: doc.document_ai_summaries?.[0] || null,
  }));
}

export async function getMatterDocuments(matterId: string) {
  return listMatterDocuments(matterId);
}

export async function getDocumentDetail(documentId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data: doc, error } = await adminDb
    .from('documents')
    .select(`
      id,
      title,
      is_privileged,
      status,
      confidentiality_level,
      category,
      document_type,
      ai_processed,
      approval_status,
      created_at,
      document_versions (
        id,
        version_number,
        file_name,
        file_size,
        mime_type,
        classification,
        created_at,
        storage_path
      ),
      document_ai_summaries (
        id,
        output_title,
        summary_text,
        sources_used,
        confidence_level,
        missing_information,
        suggested_next_action,
        approval_status,
        created_at,
        approved_at
      ),
      document_access_logs (
        id,
        action,
        created_at,
        member_id
      )
    `)
    .eq('id', documentId)
    .eq('firm_id', auth.firmId)
    .single();

  if (error) throw new Error(error.message);

  return {
    ...doc,
    versions: doc.document_versions || [],
    latest: doc.document_versions?.sort((a: any, b: any) => b.version_number - a.version_number)[0] || null,
    ai_summary: doc.document_ai_summaries?.[0] || null,
    access_logs: doc.document_access_logs || []
  };
}

export async function archiveDocument(documentId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Verify ownership
  const { data: doc, error: fetchErr } = await adminDb
    .from('documents')
    .select('id, matter_id, title')
    .eq('id', documentId)
    .eq('firm_id', auth.firmId)
    .single();

  if (fetchErr || !doc) {
    return { success: false, error: 'Access denied: Document not found or firm mismatch.' };
  }

  const { error: updateErr } = await adminDb
    .from('documents')
    .update({ status: 'archived' })
    .eq('id', documentId);

  if (updateErr) {
    return { success: false, error: `Failed to archive document: ${updateErr.message}` };
  }

  // Write audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'ARCHIVE_DOCUMENT',
    resource_type: 'document',
    resource_id: documentId,
    changes: { status: 'archived' }
  });

  // Write timeline event
  await adminDb.from('matter_events').insert({
    firm_id: auth.firmId,
    matter_id: doc.matter_id,
    title: 'Document Archived',
    description: `Document "${doc.title}" was archived by ${auth.userId}.`,
    event_date: new Date().toISOString(),
    created_by: auth.userId
  });

  revalidatePath(`/dashboard/matters/${doc.matter_id}/documents`);
  return { success: true };
}

export async function generatePlaceholderAISummary(documentId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Fetch document metadata
  const { data: doc, error: docErr } = await adminDb
    .from('documents')
    .select(`
      id,
      firm_id,
      matter_id,
      title,
      category,
      document_versions (
        file_name
      )
    `)
    .eq('id', documentId)
    .eq('firm_id', auth.firmId)
    .single();

  if (docErr || !doc) {
    return { success: false, error: 'Access denied: Document not found or firm mismatch.' };
  }

  const latestVersion = doc.document_versions?.[0];

  // 1. Create Placeholder AI Summary in pending status
  const summaryId = crypto.randomUUID();
  const summaryText = 'This is a placeholder document summary generated for workflow validation. Live AI extraction is not enabled yet.';
  const outputTitle = 'Placeholder Document Summary';
  const confidenceLevel = 'low';
  const missingInfo = 'Live document extraction is not yet enabled. Review the document manually before relying on this summary.';
  const suggestedNextAction = 'Review document manually and approve metadata classification.';

  const sourcesUsed = [
    {
      document_id: doc.id,
      title: doc.title,
      filename: latestVersion?.file_name || 'unknown',
      category: doc.category || 'unknown',
      generated_at: new Date().toISOString()
    }
  ];

  const { error: summaryErr } = await adminDb
    .from('document_ai_summaries')
    .insert({
      id: summaryId,
      firm_id: auth.firmId,
      matter_id: doc.matter_id,
      document_id: documentId,
      output_title: outputTitle,
      summary_text: summaryText,
      sources_used: sourcesUsed,
      confidence_level: confidenceLevel,
      missing_information: missingInfo,
      suggested_next_action: suggestedNextAction,
      approval_status: 'pending',
      generated_by: auth.userId
    });

  if (summaryErr) {
    return { success: false, error: `AI summary creation failed: ${summaryErr.message}` };
  }

  // 2. Create document source reference
  await adminDb
    .from('document_source_references')
    .insert({
      firm_id: auth.firmId,
      matter_id: doc.matter_id,
      document_id: documentId,
      summary_id: summaryId,
      source_document_id: documentId,
      source_type: 'PDF',
      page_number: 1,
      field_name: 'Summary Source',
      citation_text: 'Placeholder source reference for page 1.'
    });

  // 3. Update document status to review_pending
  await adminDb
    .from('documents')
    .update({
      status: 'review_pending',
      ai_processed: true
    })
    .eq('id', documentId);

  // Write audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'GENERATE_AI_SUMMARY_PLACEHOLDER',
    resource_type: 'document_ai_summaries',
    resource_id: summaryId,
    changes: {
      document_id: documentId,
      confidence_level: confidenceLevel,
      approval_status: 'pending'
    }
  });

  // Write timeline event
  await adminDb.from('matter_events').insert({
    firm_id: auth.firmId,
    matter_id: doc.matter_id,
    title: 'AI Summary Generated (Placeholder)',
    description: `A placeholder AI summary was generated for "${doc.title}".`,
    event_date: new Date().toISOString(),
    created_by: auth.userId
  });

  revalidatePath(`/dashboard/matters/${doc.matter_id}/documents`);
  return { success: true, data: { summaryId } };
}

export async function approveRejectAISummary(summaryId: string, decision: 'approved' | 'rejected') {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Fetch summary
  const { data: summary, error: summaryErr } = await adminDb
    .from('document_ai_summaries')
    .select('document_id, matter_id, firm_id')
    .eq('id', summaryId)
    .eq('firm_id', auth.firmId)
    .single();

  if (summaryErr || !summary) {
    return { success: false, error: 'Access denied: Summary not found or firm mismatch.' };
  }

  // Update summary
  const { error: updateSummaryErr } = await adminDb
    .from('document_ai_summaries')
    .update({
      approval_status: decision,
      approved_by: auth.userId,
      approved_at: decision === 'approved' ? new Date().toISOString() : null
    })
    .eq('id', summaryId);

  if (updateSummaryErr) {
    return { success: false, error: `Failed to update summary status: ${updateSummaryErr.message}` };
  }

  // Update document
  const { error: updateDocErr } = await adminDb
    .from('documents')
    .update({
      status: decision === 'approved' ? 'approved' : 'rejected',
      approval_status: decision
    })
    .eq('id', summary.document_id);

  if (updateDocErr) {
    return { success: false, error: `Failed to update document status: ${updateDocErr.message}` };
  }

  // Write audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: decision === 'approved' ? 'APPROVE_AI_SUMMARY' : 'REJECT_AI_SUMMARY',
    resource_type: 'document_ai_summaries',
    resource_id: summaryId,
    changes: { approval_status: decision }
  });

  // Write timeline event
  await adminDb.from('matter_events').insert({
    firm_id: auth.firmId,
    matter_id: summary.matter_id,
    title: decision === 'approved' ? 'AI Summary Approved' : 'AI Summary Rejected',
    description: `The AI summary for document has been ${decision} by ${auth.userId}.`,
    event_date: new Date().toISOString(),
    created_by: auth.userId
  });

  revalidatePath(`/dashboard/matters/${summary.matter_id}/documents`);
  return { success: true };
}

export async function createDocumentVersion(formData: FormData) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const file = formData.get('file');
  const documentId = formData.get('documentId') as string;
  const classification = formData.get('classification') as any;

  if (!documentId) return { success: false, error: 'Document ID is required.' };
  if (!(file instanceof File)) {
    return { success: false, error: 'Document file is required.' };
  }

  // Verify document ownership
  const { data: doc, error: docError } = await adminDb
    .from('documents')
    .select('id, firm_id, matter_id, title, category')
    .eq('id', documentId)
    .eq('firm_id', auth.firmId)
    .single();

  if (docError || !doc) {
    return { success: false, error: 'Access denied: Document not found or firm mismatch.' };
  }

  // Validate file
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'text/plain'
  ];

  if (!allowedMimeTypes.includes(file.type)) {
    return { success: false, error: `Invalid file type: ${file.type}. Allowed types: PDF, DOCX, PNG, JPG, TXT.` };
  }

  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxBytes) {
    return { success: false, error: 'File size exceeds the 5MB limit.' };
  }

  // Get next version number
  const { data: versions, error: verErr } = await adminDb
    .from('document_versions')
    .select('version_number')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false })
    .limit(1);

  if (verErr) {
    return { success: false, error: `Failed to determine next version number: ${verErr.message}` };
  }

  const nextVersionNum = (versions?.[0]?.version_number || 0) + 1;

  // Safe file extension and storage path
  const versionId = crypto.randomUUID();
  const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${auth.firmId}/${doc.matter_id}/${doc.id}/${versionId}/${safeFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage
  const { error: storageError } = await adminDb.storage
    .from('legal-matters-docs')
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false
    });

  if (storageError) {
    return { success: false, error: `Storage upload failed: ${storageError.message}` };
  }

  // Insert new version
  const { error: versionError } = await adminDb
    .from('document_versions')
    .insert({
      id: versionId,
      firm_id: auth.firmId,
      document_id: documentId,
      version_number: nextVersionNum,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      classification: classification || doc.category || 'Correspondence',
      uploaded_by: auth.userId
    });

  if (versionError) {
    await adminDb.storage.from('legal-matters-docs').remove([storagePath]);
    return { success: false, error: `Version registration failed: ${versionError.message}` };
  }

  // Reset document statuses to allow review of the new version
  const { error: updateDocErr } = await adminDb
    .from('documents')
    .update({
      status: 'uploaded',
      ai_processed: false,
      approval_status: 'pending'
    })
    .eq('id', documentId);

  if (updateDocErr) {
    await adminDb.from('document_versions').delete().eq('id', versionId);
    await adminDb.storage.from('legal-matters-docs').remove([storagePath]);
    return { success: false, error: `Document status reset failed: ${updateDocErr.message}` };
  }

  // Create document_processing_jobs row
  const { error: jobError } = await adminDb
    .from('document_processing_jobs')
    .insert({
      firm_id: auth.firmId,
      matter_id: doc.matter_id,
      document_id: documentId,
      document_version_id: versionId,
      job_type: 'extraction',
      status: 'queued',
      created_by: auth.userId
    });

  if (jobError) {
    await adminDb.from('document_versions').delete().eq('id', versionId);
    await adminDb.storage.from('legal-matters-docs').remove([storagePath]);
    return { success: false, error: `Processing job registration failed: ${jobError.message}` };
  }

  // Write audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'UPLOAD_NEW_VERSION',
    resource_type: 'document',
    resource_id: documentId,
    changes: {
      version_number: nextVersionNum,
      file_name: file.name,
      file_size: file.size
    }
  });

  // Write timeline event
  await adminDb.from('matter_events').insert({
    firm_id: auth.firmId,
    matter_id: doc.matter_id,
    title: 'New Document Version Uploaded',
    description: `Version ${nextVersionNum} of "${doc.title}" was uploaded by ${auth.userId}.`,
    event_date: new Date().toISOString(),
    created_by: auth.userId
  });

  revalidatePath(`/dashboard/matters/${doc.matter_id}/documents`);
  return { success: true };
}

export async function getDocumentDownloadUrl(documentId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Verify document access exists
  const { data: doc, error: docErr } = await adminDb
    .from('documents')
    .select('id, firm_id, is_privileged, document_versions(storage_path, version_number)')
    .eq('id', documentId)
    .eq('firm_id', auth.firmId)
    .single();

  if (docErr) throw new Error(docErr.message);

  // Get the latest storage path
  const latestVersion = doc.document_versions?.sort((a: any, b: any) => b.version_number - a.version_number)[0];
  const storagePath = latestVersion?.storage_path;
  if (!storagePath) throw new Error('File version reference not found.');

  // Generate temporary signed download link from Supabase Storage
  const { data: signed, error: storageErr } = await adminDb
    .storage
    .from('legal-matters-docs')
    .createSignedUrl(storagePath, 300); // valid for 5 minutes

  if (storageErr) throw new Error(storageErr.message);

  // Write Access Log per POPIA guidelines
  await adminDb.from('document_access_logs').insert({
    firm_id: auth.firmId,
    document_id: documentId,
    member_id: auth.userId,
    action: 'DOWNLOAD',
  });

  return signed.signedUrl;
}

export async function getAllDocuments() {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('documents')
    .select(`
      id,
      title,
      is_privileged,
      status,
      confidentiality_level,
      category,
      document_type,
      ai_processed,
      approval_status,
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
    .eq('firm_id', auth.firmId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((doc: any) => ({
    id: doc.id,
    title: doc.title,
    is_privileged: doc.is_privileged,
    status: doc.status,
    confidentiality_level: doc.confidentiality_level,
    category: doc.category,
    document_type: doc.document_type,
    ai_processed: doc.ai_processed,
    approval_status: doc.approval_status,
    created_at: doc.created_at,
    matter: doc.matters || null,
    versions: doc.document_versions || [],
    latest: doc.document_versions?.sort((a: any, b: any) => b.version_number - a.version_number)[0] || null,
  }));
}
