'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

/**
 * Retrieves all queued extraction jobs belonging to the authenticated practitioner's firm.
 */
export async function getQueuedDocumentProcessingJobs() {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('document_processing_jobs')
    .select('*')
    .eq('firm_id', auth.firmId)
    .eq('status', 'queued')
    .eq('job_type', 'extraction')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Processes a queued extraction job by updating job status and creating/updating extraction rows.
 * Enforces firm boundaries, AI exclusion checks, and idempotency.
 */
export async function processDocumentExtractionJob(jobId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // 1. Fetch job details
  const { data: job, error: jobErr } = await adminDb
    .from('document_processing_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobErr || !job) {
    return { success: false, error: 'Access denied: Job not found.' };
  }

  // Verify user's firm ID matches the job
  if (job.firm_id !== auth.firmId) {
    return { success: false, error: 'Access denied: Job not found or firm mismatch.' };
  }

  // Verify job state
  if (job.status !== 'queued' || job.job_type !== 'extraction') {
    return { success: false, error: `Invalid job state: status=${job.status}, type=${job.job_type}.` };
  }

  // 2. Fetch target document
  const { data: doc, error: docErr } = await adminDb
    .from('documents')
    .select('id, title, category, is_ai_excluded')
    .eq('id', job.document_id)
    .eq('firm_id', auth.firmId)
    .single();

  if (docErr || !doc) {
    return { success: false, error: 'Access denied: Document not found or firm mismatch.' };
  }

  // 3. Handle document AI exclusion
  if (doc.is_ai_excluded) {
    const errorMsg = 'Document is flagged for AI exclusion.';

    // Transition job to cancelled status
    await adminDb
      .from('document_processing_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        error_message: errorMsg,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Audit log
    await adminDb.from('audit_logs').insert({
      firm_id: auth.firmId,
      user_id: auth.userId,
      action: 'BLOCK_DOCUMENT_EXTRACTION_EXCLUDED',
      resource_type: 'document_processing_jobs',
      resource_id: jobId,
      changes: {
        document_id: job.document_id,
        reason: errorMsg
      }
    });

    // Timeline event
    await adminDb.from('matter_events').insert({
      firm_id: auth.firmId,
      matter_id: job.matter_id,
      title: 'AI Extraction Blocked',
      description: `Extraction was skipped because document "${doc.title}" is flagged for AI exclusion.`,
      event_date: new Date().toISOString(),
      created_by: auth.userId
    });

    return { success: false, error: errorMsg };
  }

  // 4. Update status to processing
  const { error: startErr } = await adminDb
    .from('document_processing_jobs')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);

  if (startErr) {
    return { success: false, error: `Failed to transition job to processing: ${startErr.message}` };
  }

  // Write audit log for start
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'START_DOCUMENT_EXTRACTION',
    resource_type: 'document_processing_jobs',
    resource_id: jobId,
    changes: {
      document_id: job.document_id,
      version_id: job.document_version_id
    }
  });

  try {
    // 5. Load document version file details
    const { data: version, error: versionErr } = await adminDb
      .from('document_versions')
      .select('file_name, mime_type, file_size, storage_path')
      .eq('id', job.document_version_id)
      .eq('firm_id', auth.firmId)
      .single();

    if (versionErr || !version) {
      throw new Error(`Document version not found or firm mismatch: ${versionErr?.message || ''}`);
    }

    // 6. Check for existing extraction to preserve idempotency
    const { data: existingExt, error: extQueryErr } = await adminDb
      .from('document_extractions')
      .select('id')
      .eq('document_version_id', job.document_version_id)
      .eq('firm_id', auth.firmId)
      .maybeSingle();

    let extractionId: string;

    if (existingExt) {
      extractionId = existingExt.id;
    } else {
      // Simulate deterministic placeholder extraction
      const mockText = `Placeholder extraction for ${version.file_name}`;
      const mockFields = {
        file_name: version.file_name,
        mime_type: version.mime_type,
        file_size: version.file_size,
        storage_path: version.storage_path,
        note: 'Extraction is simulated.'
      };

      const newExtId = crypto.randomUUID();
      const { error: insertErr } = await adminDb
        .from('document_extractions')
        .insert({
          id: newExtId,
          firm_id: auth.firmId,
          matter_id: job.matter_id,
          document_id: job.document_id,
          document_version_id: job.document_version_id,
          processing_job_id: jobId,
          extraction_type: 'text',
          extracted_text: mockText,
          extracted_fields: mockFields,
          confidence: 'low',
          status: 'draft'
        });

      if (insertErr) {
        throw new Error(`Failed to insert document extraction: ${insertErr.message}`);
      }

      extractionId = newExtId;
    }

    // 7. Transition job to completed status
    await adminDb
      .from('document_processing_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Audit log for completion
    await adminDb.from('audit_logs').insert({
      firm_id: auth.firmId,
      user_id: auth.userId,
      action: 'COMPLETE_DOCUMENT_EXTRACTION',
      resource_type: 'document_processing_jobs',
      resource_id: jobId,
      changes: {
        document_id: job.document_id,
        extraction_id: extractionId
      }
    });

    // Timeline event
    await adminDb.from('matter_events').insert({
      firm_id: auth.firmId,
      matter_id: job.matter_id,
      title: 'Document Processed',
      description: `AI text extraction completed successfully (simulated) for document "${doc.title}".`,
      event_date: new Date().toISOString(),
      created_by: auth.userId
    });

    revalidatePath(`/dashboard/matters/${job.matter_id}/documents`);
    return { success: true, extractionId };

  } catch (err: any) {
    const errorMsg = err.message || 'Unknown processing error';

    // Transition job to failed status
    await adminDb
      .from('document_processing_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMsg,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Audit log for failure
    await adminDb.from('audit_logs').insert({
      firm_id: auth.firmId,
      user_id: auth.userId,
      action: 'FAIL_DOCUMENT_EXTRACTION',
      resource_type: 'document_processing_jobs',
      resource_id: jobId,
      changes: {
        document_id: job.document_id,
        error: errorMsg
      }
    });

    return { success: false, error: errorMsg };
  }
}

/**
 * Returns all document extractions for a given document under the authenticated practitioner's firm context.
 */
export async function getDocumentExtractions(documentId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .eq('firm_id', auth.firmId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
