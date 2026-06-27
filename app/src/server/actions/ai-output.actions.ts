'use server';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import {
  CreateAiOutputSchema,
  CreateAiOutputSourceSchema,
  ReviewAiOutputSchema,
  ApproveAiOutputSchema,
  RejectAiOutputSchema
} from '@/schemas';

/**
 * Creates a new AI output record and its associated source citations.
 * Enforces firm boundaries, validation rules, and summary citation requirements.
 */
export async function createAiOutput(input: any) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const parsed = CreateAiOutputSchema.parse(input);

  // Validate matter ownership
  if (parsed.matter_id) {
    const { data: matter, error: matterErr } = await adminDb
      .from('matters')
      .select('id')
      .eq('id', parsed.matter_id)
      .eq('firm_id', auth.firmId)
      .single();
    if (matterErr || !matter) {
      throw new Error('Access denied: Matter not found or firm mismatch.');
    }
  }

  // Validate document ownership
  if (parsed.document_id) {
    const { data: doc, error: docErr } = await adminDb
      .from('documents')
      .select('id')
      .eq('id', parsed.document_id)
      .eq('firm_id', auth.firmId)
      .single();
    if (docErr || !doc) {
      throw new Error('Access denied: Document not found or firm mismatch.');
    }
  }

  // Enforce source citation requirements
  const hasCitations = parsed.citations && parsed.citations.length > 0;
  if ((parsed.output_type === 'document_summary' || parsed.output_type === 'matter_summary') && !hasCitations) {
    throw new Error('AI summaries require at least one source citation.');
  }

  // Verify all citations are same-firm scoped
  if (hasCitations) {
    for (const cite of parsed.citations) {
      if (cite.document_id) {
        const { data: doc, error: docErr } = await adminDb
          .from('documents')
          .select('id')
          .eq('id', cite.document_id)
          .eq('firm_id', auth.firmId)
          .single();
        if (docErr || !doc) {
          throw new Error(`Access denied: Cited document ${cite.document_id} belongs to another firm.`);
        }
      }
      if (cite.source_type === 'extraction' && cite.source_ref_id) {
        const { data: ext, error: extErr } = await adminDb
          .from('document_extractions')
          .select('id')
          .eq('id', cite.source_ref_id)
          .eq('firm_id', auth.firmId)
          .single();
        if (extErr || !ext) {
          throw new Error(`Access denied: Cited extraction ${cite.source_ref_id} belongs to another firm.`);
        }
      }
    }
  }

  const aiOutputId = crypto.randomUUID();

  // Insert AI output
  const { data: aiOutput, error: insertErr } = await adminDb
    .from('ai_outputs')
    .insert({
      id: aiOutputId,
      firm_id: auth.firmId,
      matter_id: parsed.matter_id || null,
      document_id: parsed.document_id || null,
      output_type: parsed.output_type,
      title: parsed.title,
      content: parsed.content,
      confidence: parsed.confidence,
      missing_information: parsed.missing_information,
      suggested_next_actions: parsed.suggested_next_actions,
      status: parsed.status || 'draft',
      generated_by: auth.userId
    })
    .select('*')
    .single();

  if (insertErr || !aiOutput) {
    throw new Error(`Failed to insert AI output: ${insertErr?.message || 'Unknown error'}`);
  }

  // Insert sources
  if (hasCitations) {
    const citationsData = parsed.citations.map((cite) => ({
      firm_id: auth.firmId,
      ai_output_id: aiOutputId,
      matter_id: parsed.matter_id || null,
      document_id: cite.document_id || parsed.document_id || null,
      document_version_id: cite.document_version_id || null,
      source_type: cite.source_type,
      source_ref_id: cite.source_ref_id || null,
      page_number: cite.page_number || null,
      quote: cite.quote || null,
      source_label: cite.source_label || null,
      confidence: cite.confidence || null
    }));

    const { error: citeErr } = await adminDb
      .from('ai_output_sources')
      .insert(citationsData);

    if (citeErr) {
      // Cleanup to preserve database sanity
      await adminDb.from('ai_outputs').delete().eq('id', aiOutputId);
      throw new Error(`Failed to insert citation references: ${citeErr.message}`);
    }
  }

  // Write audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'CREATE_AI_OUTPUT',
    resource_type: 'ai_outputs',
    resource_id: aiOutputId,
    changes: {
      output_type: parsed.output_type,
      title: parsed.title
    }
  });

  if (parsed.matter_id) {
    revalidatePath(`/dashboard/matters/${parsed.matter_id}/documents`);
  }
  return aiOutput;
}

/**
 * Returns all AI outputs for a matter under the practitioner's firm.
 */
export async function getMatterAiOutputs(matterId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('ai_outputs')
    .select('*')
    .eq('matter_id', matterId)
    .eq('firm_id', auth.firmId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Returns all AI outputs for a document under the practitioner's firm.
 */
export async function getDocumentAiOutputs(documentId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('ai_outputs')
    .select('*')
    .eq('document_id', documentId)
    .eq('firm_id', auth.firmId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Retrieves a single AI output and all its associated citation sources.
 */
export async function getAiOutputWithSources(aiOutputId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data: output, error: outErr } = await adminDb
    .from('ai_outputs')
    .select('*')
    .eq('id', aiOutputId)
    .eq('firm_id', auth.firmId)
    .single();

  if (outErr || !output) {
    throw new Error('Access denied: AI output not found.');
  }

  const { data: sources, error: sourceErr } = await adminDb
    .from('ai_output_sources')
    .select('*')
    .eq('ai_output_id', aiOutputId)
    .eq('firm_id', auth.firmId);

  if (sourceErr) throw new Error(sourceErr.message);

  return {
    ...output,
    sources: sources || []
  };
}

/**
 * Adds citation source references to an existing draft/reviewed AI output.
 * Approved, rejected, or superseded outputs are locked.
 */
export async function addAiOutputSources(aiOutputId: string, sources: any[]) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Load output
  const { data: output, error: outErr } = await adminDb
    .from('ai_outputs')
    .select('*')
    .eq('id', aiOutputId)
    .eq('firm_id', auth.firmId)
    .single();

  if (outErr || !output) {
    throw new Error('Access denied: AI output not found.');
  }

  // Lock checks
  if (['approved', 'rejected', 'superseded'].includes(output.status)) {
    throw new Error('Approved, rejected, or superseded AI outputs cannot be modified.');
  }

  const parsedSources = z.array(CreateAiOutputSourceSchema).parse(sources);

  // Validate sources
  for (const cite of parsedSources) {
    if (cite.document_id) {
      const { data: doc, error: docErr } = await adminDb
        .from('documents')
        .select('id')
        .eq('id', cite.document_id)
        .eq('firm_id', auth.firmId)
        .single();
      if (docErr || !doc) {
        throw new Error(`Access denied: Cited document ${cite.document_id} belongs to another firm.`);
      }
    }
    if (cite.source_type === 'extraction' && cite.source_ref_id) {
      const { data: ext, error: extErr } = await adminDb
        .from('document_extractions')
        .select('id')
        .eq('id', cite.source_ref_id)
        .eq('firm_id', auth.firmId)
        .single();
      if (extErr || !ext) {
        throw new Error(`Access denied: Cited extraction ${cite.source_ref_id} belongs to another firm.`);
      }
    }
  }

  const citationsData = parsedSources.map((cite) => ({
    firm_id: auth.firmId,
    ai_output_id: aiOutputId,
    matter_id: output.matter_id,
    document_id: cite.document_id || output.document_id,
    document_version_id: cite.document_version_id || null,
    source_type: cite.source_type,
    source_ref_id: cite.source_ref_id || null,
    page_number: cite.page_number || null,
    quote: cite.quote || null,
    source_label: cite.source_label || null,
    confidence: cite.confidence || null
  }));

  const { error: citeErr } = await adminDb
    .from('ai_output_sources')
    .insert(citationsData);

  if (citeErr) throw new Error(citeErr.message);

  // Write audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'ADD_AI_OUTPUT_SOURCES',
    resource_type: 'ai_outputs',
    resource_id: aiOutputId,
    changes: { added_count: sources.length }
  });

  if (output.matter_id) {
    revalidatePath(`/dashboard/matters/${output.matter_id}/documents`);
  }
  return { success: true };
}

/**
 * Transitions AI output from draft to reviewed.
 */
export async function reviewAiOutput(aiOutputId: string, reviewData: any) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const parsed = ReviewAiOutputSchema.parse(reviewData);

  // Load output
  const { data: output, error: outErr } = await adminDb
    .from('ai_outputs')
    .select('*')
    .eq('id', aiOutputId)
    .eq('firm_id', auth.firmId)
    .single();

  if (outErr || !output) {
    throw new Error('Access denied: AI output not found.');
  }

  if (output.status !== 'draft') {
    throw new Error('Only draft AI outputs can be reviewed.');
  }

  // Update status
  const { error: updateErr } = await adminDb
    .from('ai_outputs')
    .update({ status: 'reviewed', updated_at: new Date().toISOString() })
    .eq('id', aiOutputId);

  if (updateErr) throw new Error(updateErr.message);

  // Approval event
  await adminDb.from('ai_approval_events').insert({
    firm_id: auth.firmId,
    ai_output_id: aiOutputId,
    matter_id: output.matter_id,
    action: 'reviewed',
    actor_id: auth.userId,
    reason: parsed.reason || null
  });

  // Write audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'REVIEW_AI_OUTPUT',
    resource_type: 'ai_outputs',
    resource_id: aiOutputId,
    changes: { status: 'reviewed', reason: parsed.reason }
  });

  if (output.matter_id) {
    revalidatePath(`/dashboard/matters/${output.matter_id}/documents`);
  }
  return { success: true };
}

/**
 * Approves an AI output, locking it and writing timeline & audit logs.
 */
export async function approveAiOutput(aiOutputId: string, approvalData: any) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const parsed = ApproveAiOutputSchema.parse(approvalData);

  // Load output
  const { data: output, error: outErr } = await adminDb
    .from('ai_outputs')
    .select('*')
    .eq('id', aiOutputId)
    .eq('firm_id', auth.firmId)
    .single();

  if (outErr || !output) {
    throw new Error('Access denied: AI output not found.');
  }

  if (!['draft', 'reviewed'].includes(output.status)) {
    throw new Error('Only draft or reviewed AI outputs can be approved.');
  }

  // Update status to approved
  const { error: updateErr } = await adminDb
    .from('ai_outputs')
    .update({
      status: 'approved',
      approved_by: auth.userId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', aiOutputId);

  if (updateErr) throw new Error(updateErr.message);

  // If this AI output is associated with a document, sync document statuses
  if (output.document_id) {
    await adminDb
      .from('documents')
      .update({
        status: 'approved',
        approval_status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', output.document_id)
      .eq('firm_id', auth.firmId);
  }

  // Approval event
  await adminDb.from('ai_approval_events').insert({
    firm_id: auth.firmId,
    ai_output_id: aiOutputId,
    matter_id: output.matter_id,
    action: 'approved',
    actor_id: auth.userId,
    reason: parsed.reason || null
  });

  // Audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'APPROVE_AI_OUTPUT',
    resource_type: 'ai_outputs',
    resource_id: aiOutputId,
    changes: { status: 'approved', reason: parsed.reason }
  });

  // Timeline event
  if (output.matter_id) {
    await adminDb.from('matter_events').insert({
      firm_id: auth.firmId,
      matter_id: output.matter_id,
      title: 'AI Summary Approved',
      description: `AI output "${output.title}" was approved by ${auth.userId}.`,
      event_date: new Date().toISOString(),
      created_by: auth.userId
    });
    revalidatePath(`/dashboard/matters/${output.matter_id}/documents`);
  }

  return { success: true };
}

/**
 * Rejects an AI output.
 */
export async function rejectAiOutput(aiOutputId: string, rejectionData: any) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const parsed = RejectAiOutputSchema.parse(rejectionData);

  // Load output
  const { data: output, error: outErr } = await adminDb
    .from('ai_outputs')
    .select('*')
    .eq('id', aiOutputId)
    .eq('firm_id', auth.firmId)
    .single();

  if (outErr || !output) {
    throw new Error('Access denied: AI output not found.');
  }

  if (!['draft', 'reviewed'].includes(output.status)) {
    throw new Error('Only draft or reviewed AI outputs can be rejected.');
  }

  // Update status to rejected
  const { error: updateErr } = await adminDb
    .from('ai_outputs')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', aiOutputId);

  if (updateErr) throw new Error(updateErr.message);

  // Update document approval status if linked
  if (output.document_id) {
    await adminDb
      .from('documents')
      .update({
        status: 'rejected',
        approval_status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', output.document_id)
      .eq('firm_id', auth.firmId);
  }

  // Approval event
  await adminDb.from('ai_approval_events').insert({
    firm_id: auth.firmId,
    ai_output_id: aiOutputId,
    matter_id: output.matter_id,
    action: 'rejected',
    actor_id: auth.userId,
    reason: parsed.reason
  });

  // Audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'REJECT_AI_OUTPUT',
    resource_type: 'ai_outputs',
    resource_id: aiOutputId,
    changes: { status: 'rejected', reason: parsed.reason }
  });

  // Timeline event
  if (output.matter_id) {
    await adminDb.from('matter_events').insert({
      firm_id: auth.firmId,
      matter_id: output.matter_id,
      title: 'AI Summary Rejected',
      description: `AI output "${output.title}" was rejected by ${auth.userId}. Reason: ${parsed.reason}`,
      event_date: new Date().toISOString(),
      created_by: auth.userId
    });
    revalidatePath(`/dashboard/matters/${output.matter_id}/documents`);
  }

  return { success: true };
}

/**
 * Formal supersession action: marks an approved output as superseded, locks it,
 * and creates a replacement draft referencing it.
 */
export async function supersedeAiOutput(aiOutputId: string, replacementInput: any) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Load parent output
  const { data: parentOutput, error: outErr } = await adminDb
    .from('ai_outputs')
    .select('*')
    .eq('id', aiOutputId)
    .eq('firm_id', auth.firmId)
    .single();

  if (outErr || !parentOutput) {
    throw new Error('Access denied: AI output not found.');
  }

  if (parentOutput.status !== 'approved') {
    throw new Error('Only approved AI outputs can be superseded.');
  }

  // Create new replacement output with parent link
  const replacementData = {
    ...replacementInput,
    status: 'draft' // Fresh superseding replacements start as draft
  };

  const newOutput = await createAiOutput(replacementData);

  // Link new output's supersede reference
  const { error: updateNewErr } = await adminDb
    .from('ai_outputs')
    .update({ supersedes_ai_output_id: aiOutputId })
    .eq('id', newOutput.id);

  if (updateNewErr) {
    // Cleanup if reference insert fails
    await adminDb.from('ai_outputs').delete().eq('id', newOutput.id);
    throw new Error(`Failed to link supersession reference: ${updateNewErr.message}`);
  }

  // Transition parent to superseded status
  const { error: parentUpdateErr } = await adminDb
    .from('ai_outputs')
    .update({ status: 'superseded', updated_at: new Date().toISOString() })
    .eq('id', aiOutputId);

  if (parentUpdateErr) {
    // Rollback new output
    await adminDb.from('ai_outputs').delete().eq('id', newOutput.id);
    throw new Error(`Failed to transition parent status: ${parentUpdateErr.message}`);
  }

  // Approval event for parent output
  await adminDb.from('ai_approval_events').insert({
    firm_id: auth.firmId,
    ai_output_id: aiOutputId,
    matter_id: parentOutput.matter_id,
    action: 'superseded',
    actor_id: auth.userId,
    reason: `Superseded by new AI output version: ${newOutput.id}`
  });

  // Audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'SUPERSEDE_AI_OUTPUT',
    resource_type: 'ai_outputs',
    resource_id: aiOutputId,
    changes: { superseded_by: newOutput.id }
  });

  if (parentOutput.matter_id) {
    revalidatePath(`/dashboard/matters/${parentOutput.matter_id}/documents`);
  }
  return newOutput;
}

/**
 * Deterministic helper that creates a placeholder draft AI output from a document extraction.
 * Cites the extraction and documents as sources.
 */
export async function createPlaceholderAiOutputFromExtraction(documentId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // 1. Fetch latest extraction
  const { data: ext, error: extErr } = await adminDb
    .from('document_extractions')
    .select('id, document_version_id, matter_id, extracted_text')
    .eq('document_id', documentId)
    .eq('firm_id', auth.firmId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (extErr || !ext) {
    throw new Error('No document extractions found to build placeholder summary from.');
  }

  // 2. Fetch document metadata
  const { data: doc, error: docErr } = await adminDb
    .from('documents')
    .select('id, title, category')
    .eq('id', documentId)
    .eq('firm_id', auth.firmId)
    .single();

  if (docErr || !doc) {
    throw new Error('Access denied: Document not found or firm mismatch.');
  }

  // 3. Assemble placeholder summary content
  const payload = {
    matter_id: ext.matter_id,
    document_id: documentId,
    output_type: 'document_summary',
    title: `AI Summary: ${doc.title}`,
    content: {
      document_type: doc.category || 'Pleading',
      key_facts: [`Simulated analysis of ${doc.title}`],
      legal_obligations: ['Manual review required to extract LPC or compliance obligations.']
    },
    confidence: 'low',
    missing_information: ['Live text summaries are pending live Gemini API integrations.'],
    suggested_next_actions: ['Verify all facts and check document details.'],
    status: 'draft',
    citations: [
      {
        source_type: 'extraction',
        source_ref_id: ext.id,
        document_id: documentId,
        document_version_id: ext.document_version_id,
        page_number: 1,
        quote: ext.extracted_text.substring(0, 80),
        source_label: 'Text Extraction Source',
        confidence: 'low'
      }
    ]
  };

  const output = await createAiOutput(payload);
  return { success: true, aiOutputId: output.id };
}
