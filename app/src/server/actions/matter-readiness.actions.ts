'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { RunMatterReadinessCheckSchema } from '@/schemas';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// ADVISORY NOTE — attached to every readiness result
// ---------------------------------------------------------------------------
const ADVISORY_NOTE =
  'This readiness report is an advisory tool only and does not constitute ' +
  'legal advice. All findings require attorney review before any action is ' +
  'taken. The platform does not make legally conclusive determinations.';

// ---------------------------------------------------------------------------
// Severity deduction weights used in scoring
// ---------------------------------------------------------------------------
const SEVERITY_DEDUCTIONS: Record<string, number> = {
  critical: 40,
  high: 20,
  medium: 10,
  low: 5,
  info: 0,
};

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------
interface ReadinessItem {
  category: string;
  label: string;
  status: 'passed' | 'missing' | 'warning' | 'blocked';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  source_type?: string | null;
  source_ref_id?: string | null;
  recommendation?: string | null;
}

// ---------------------------------------------------------------------------
// Score and status derivation
// ---------------------------------------------------------------------------
function deriveScoreAndStatus(items: ReadinessItem[]): {
  score: number;
  status: 'not_ready' | 'needs_review' | 'ready';
} {
  let score = 100;
  let hasCriticalBlock = false;

  for (const item of items) {
    if (item.status === 'passed' || item.status === undefined) continue;
    score -= SEVERITY_DEDUCTIONS[item.severity] ?? 0;
    if (item.severity === 'critical' && item.status === 'blocked') {
      hasCriticalBlock = true;
    }
  }

  score = Math.max(0, Math.min(100, score));

  let status: 'not_ready' | 'needs_review' | 'ready';
  if (hasCriticalBlock || score < 60) {
    status = 'not_ready';
  } else if (score < 85) {
    status = 'needs_review';
  } else {
    status = 'ready';
  }

  return { score, status };
}

// ===========================================================================
// runMatterReadinessCheck
// Evaluates a matter across all configured readiness categories, persists the
// result to matter_readiness_checks + matter_readiness_items, and returns the
// full structured result.
// ===========================================================================
export async function runMatterReadinessCheck(
  matterId: string,
  readinessType: string = 'full'
) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Validate inputs
  const parsed = RunMatterReadinessCheckSchema.parse({ matter_id: matterId, readiness_type: readinessType });

  // --- 1. Firm-scope gate: reject cross-firm matter IDs --------------------------
  const { data: matter, error: matErr } = await adminDb
    .from('matters')
    .select('id, title, status, description, case_number, court_jurisdiction, client_id, closed_at')
    .eq('id', parsed.matter_id)
    .eq('firm_id', auth.firmId)
    .single();

  if (matErr || !matter) {
    throw new Error('Access denied: Matter not found or belongs to another firm.');
  }

  const items: ReadinessItem[] = [];
  const runAll = parsed.readiness_type === 'full';
  const type = parsed.readiness_type;

  // ==========================================================================
  // CATEGORY A: Matter Metadata Completeness
  // ==========================================================================
  if (runAll || type === 'documents') {
    if (!matter.description || matter.description.trim().length < 10) {
      items.push({
        category: 'matter_metadata',
        label: 'Matter description is missing or too short',
        status: 'missing',
        severity: 'low',
        source_type: 'matter_field',
        source_ref_id: null,
        recommendation: 'Add a detailed matter description (minimum 10 characters).',
      });
    } else {
      items.push({
        category: 'matter_metadata',
        label: 'Matter description present',
        status: 'passed',
        severity: 'info',
        source_type: 'matter_field',
      });
    }

    if (!matter.case_number || matter.case_number.trim().length === 0) {
      items.push({
        category: 'matter_metadata',
        label: 'Case number is not assigned',
        status: 'missing',
        severity: 'medium',
        source_type: 'matter_field',
        recommendation: 'Assign a court or reference case number.',
      });
    } else {
      items.push({
        category: 'matter_metadata',
        label: 'Case number assigned',
        status: 'passed',
        severity: 'info',
        source_type: 'matter_field',
      });
    }
  }

  // ==========================================================================
  // CATEGORY B: Required Documents
  // ==========================================================================
  if (runAll || type === 'documents') {
    const { data: docs, error: docsErr } = await adminDb
      .from('documents')
      .select('id, title, status, category')
      .eq('matter_id', parsed.matter_id)
      .eq('firm_id', auth.firmId)
      .neq('status', 'archived');

    if (docsErr) throw new Error(`Failed to load documents: ${docsErr.message}`);

    if (!docs || docs.length === 0) {
      items.push({
        category: 'documents',
        label: 'No documents uploaded to this matter',
        status: 'missing',
        severity: 'high',
        source_type: 'document',
        recommendation: 'Upload at least one relevant document to proceed.',
      });
    } else {
      items.push({
        category: 'documents',
        label: `${docs.length} document(s) on file`,
        status: 'passed',
        severity: 'info',
        source_type: 'document',
      });

      // Check if any document has Pleading classification
      const hasPleading = docs.some((d: any) => d.category === 'Pleading');
      if (!hasPleading) {
        items.push({
          category: 'documents',
          label: 'No Pleading document found',
          status: 'warning',
          severity: 'medium',
          source_type: 'document',
          recommendation: 'Upload a pleading document if court proceedings are intended.',
        });
      } else {
        items.push({
          category: 'documents',
          label: 'Pleading document present',
          status: 'passed',
          severity: 'info',
          source_type: 'document',
        });
      }
    }
  }

  // ==========================================================================
  // CATEGORY C: Document Extraction Availability
  // ==========================================================================
  if (runAll || type === 'documents') {
    const { data: extractions, error: extErr } = await adminDb
      .from('document_extractions')
      .select('id, document_id, confidence')
      .eq('matter_id', parsed.matter_id)
      .eq('firm_id', auth.firmId);

    if (extErr) throw new Error(`Failed to load extractions: ${extErr.message}`);

    if (!extractions || extractions.length === 0) {
      items.push({
        category: 'extractions',
        label: 'No document extractions completed',
        status: 'warning',
        severity: 'medium',
        source_type: 'extraction',
        recommendation: 'Queue documents for extraction to enable AI-assisted review.',
      });
    } else {
      const lowConfidence = extractions.filter((e: any) => e.confidence === 'low');
      if (lowConfidence.length > 0) {
        items.push({
          category: 'extractions',
          label: `${lowConfidence.length} extraction(s) have low confidence`,
          status: 'warning',
          severity: 'low',
          source_type: 'extraction',
          source_ref_id: lowConfidence[0].id,
          recommendation: 'Review low-confidence extractions before relying on them.',
        });
      } else {
        items.push({
          category: 'extractions',
          label: `${extractions.length} extraction(s) completed`,
          status: 'passed',
          severity: 'info',
          source_type: 'extraction',
        });
      }
    }
  }

  // ==========================================================================
  // CATEGORY D: AI Outputs and Approval Status
  // ==========================================================================
  if (runAll || type === 'ai_outputs') {
    const { data: aiOutputs, error: aiErr } = await adminDb
      .from('ai_outputs')
      .select('id, status, confidence, output_type')
      .eq('matter_id', parsed.matter_id)
      .eq('firm_id', auth.firmId)
      .neq('status', 'superseded');

    if (aiErr) throw new Error(`Failed to load AI outputs: ${aiErr.message}`);

    if (!aiOutputs || aiOutputs.length === 0) {
      items.push({
        category: 'ai_outputs',
        label: 'No AI outputs generated for this matter',
        status: 'warning',
        severity: 'low',
        source_type: 'ai_output',
        recommendation: 'Generate AI-assisted summaries or matter analysis once documents are extracted.',
      });
    } else {
      const unapproved = aiOutputs.filter(
        (o: any) => o.status !== 'approved'
      );
      const approved = aiOutputs.filter((o: any) => o.status === 'approved');

      if (unapproved.length > 0) {
        items.push({
          category: 'ai_outputs',
          label: `${unapproved.length} AI output(s) pending practitioner approval`,
          status: 'warning',
          severity: 'medium',
          source_type: 'ai_output',
          source_ref_id: unapproved[0].id,
          recommendation: 'Review and approve or reject all AI outputs before proceeding.',
        });
      }

      if (approved.length > 0) {
        items.push({
          category: 'ai_outputs',
          label: `${approved.length} AI output(s) approved by practitioner`,
          status: 'passed',
          severity: 'info',
          source_type: 'ai_output',
        });
      }
    }
  }

  // ==========================================================================
  // CATEGORY E: Open Tasks
  // ==========================================================================
  if (runAll || type === 'tasks') {
    const { data: openTasks, error: taskErr } = await adminDb
      .from('matter_tasks')
      .select('id, title, status, due_date')
      .eq('matter_id', parsed.matter_id)
      .eq('firm_id', auth.firmId)
      .neq('status', 'Completed');

    if (taskErr) throw new Error(`Failed to load tasks: ${taskErr.message}`);

    if (openTasks && openTasks.length > 0) {
      const now = new Date();
      const overdueTasks = openTasks.filter(
        (t: any) => t.due_date && new Date(t.due_date) < now
      );

      if (overdueTasks.length > 0) {
        items.push({
          category: 'tasks',
          label: `${overdueTasks.length} overdue task(s) require immediate attention`,
          status: 'blocked',
          severity: 'critical',
          source_type: 'task',
          source_ref_id: overdueTasks[0].id,
          recommendation: 'Complete or reassign overdue tasks immediately.',
        });
      }

      const pendingNonOverdue = openTasks.filter(
        (t: any) => !t.due_date || new Date(t.due_date) >= now
      );
      if (pendingNonOverdue.length > 0) {
        items.push({
          category: 'tasks',
          label: `${pendingNonOverdue.length} pending task(s) in progress`,
          status: 'warning',
          severity: 'medium',
          source_type: 'task',
          source_ref_id: pendingNonOverdue[0].id,
          recommendation: 'Complete all assigned tasks before progressing this matter.',
        });
      }
    } else {
      items.push({
        category: 'tasks',
        label: 'All tasks completed',
        status: 'passed',
        severity: 'info',
        source_type: 'task',
      });
    }
  }

  // ==========================================================================
  // CATEGORY F: Incomplete / Overdue Deadlines
  // ==========================================================================
  if (runAll || type === 'deadlines') {
    const { data: deadlines, error: dlErr } = await adminDb
      .from('matter_deadlines')
      .select('id, title, deadline_date, is_completed')
      .eq('matter_id', parsed.matter_id)
      .eq('firm_id', auth.firmId)
      .eq('is_completed', false);

    if (dlErr) throw new Error(`Failed to load deadlines: ${dlErr.message}`);

    if (deadlines && deadlines.length > 0) {
      const now = new Date();
      const overdueDeadlines = deadlines.filter(
        (d: any) => d.deadline_date && new Date(d.deadline_date) < now
      );
      const upcomingDeadlines = deadlines.filter(
        (d: any) => !d.deadline_date || new Date(d.deadline_date) >= now
      );

      if (overdueDeadlines.length > 0) {
        items.push({
          category: 'deadlines',
          label: `${overdueDeadlines.length} overdue deadline(s) — urgent attention required`,
          status: 'blocked',
          severity: 'critical',
          source_type: 'deadline',
          source_ref_id: overdueDeadlines[0].id,
          recommendation: 'Address overdue deadlines immediately. Court deadlines may have legal consequences.',
        });
      }

      if (upcomingDeadlines.length > 0) {
        items.push({
          category: 'deadlines',
          label: `${upcomingDeadlines.length} upcoming deadline(s) pending`,
          status: 'warning',
          severity: 'high',
          source_type: 'deadline',
          source_ref_id: upcomingDeadlines[0].id,
          recommendation: 'Monitor and complete upcoming deadlines on schedule.',
        });
      }
    } else {
      items.push({
        category: 'deadlines',
        label: 'No open deadlines',
        status: 'passed',
        severity: 'info',
        source_type: 'deadline',
      });
    }
  }

  // ==========================================================================
  // CATEGORY G: Billing — Unbilled Time/Expenses and Unpaid Invoices
  // ==========================================================================
  if (runAll || type === 'billing') {
    // Unbilled time entries
    const { data: unbilledTime, error: timeErr } = await adminDb
      .from('time_entries')
      .select('id')
      .eq('matter_id', parsed.matter_id)
      .eq('firm_id', auth.firmId)
      .eq('is_billed', false);

    if (timeErr) throw new Error(`Failed to load time entries: ${timeErr.message}`);

    if (unbilledTime && unbilledTime.length > 0) {
      items.push({
        category: 'billing',
        label: `${unbilledTime.length} unbilled time entry/entries`,
        status: 'warning',
        severity: 'medium',
        source_type: 'expense',
        source_ref_id: unbilledTime[0].id,
        recommendation: 'Invoice all unbilled time entries before matter closure.',
      });
    } else {
      items.push({
        category: 'billing',
        label: 'All time entries billed',
        status: 'passed',
        severity: 'info',
        source_type: 'expense',
      });
    }

    // Unbilled expenses
    const { data: unbilledExpenses, error: expErr } = await adminDb
      .from('expenses')
      .select('id')
      .eq('matter_id', parsed.matter_id)
      .eq('firm_id', auth.firmId)
      .eq('is_billed', false);

    if (expErr) throw new Error(`Failed to load expenses: ${expErr.message}`);

    if (unbilledExpenses && unbilledExpenses.length > 0) {
      items.push({
        category: 'billing',
        label: `${unbilledExpenses.length} unbilled disbursement(s)`,
        status: 'warning',
        severity: 'medium',
        source_type: 'expense',
        source_ref_id: unbilledExpenses[0].id,
        recommendation: 'Invoice all unbilled expenses before matter closure.',
      });
    } else {
      items.push({
        category: 'billing',
        label: 'All disbursements billed',
        status: 'passed',
        severity: 'info',
        source_type: 'expense',
      });
    }

    // Unpaid invoices
    const { data: unpaidInvoices, error: invErr } = await adminDb
      .from('invoices')
      .select('id, invoice_number, status')
      .eq('matter_id', parsed.matter_id)
      .eq('firm_id', auth.firmId)
      .neq('status', 'Paid')
      .neq('status', 'WrittenOff');

    if (invErr) throw new Error(`Failed to load invoices: ${invErr.message}`);

    if (unpaidInvoices && unpaidInvoices.length > 0) {
      items.push({
        category: 'billing',
        label: `${unpaidInvoices.length} unpaid invoice(s) outstanding`,
        status: 'missing',
        severity: 'high',
        source_type: 'invoice',
        source_ref_id: unpaidInvoices[0].id,
        recommendation: 'Collect outstanding payments or mark invoices as written off before closing.',
      });
    } else {
      items.push({
        category: 'billing',
        label: 'All invoices settled',
        status: 'passed',
        severity: 'info',
        source_type: 'invoice',
      });
    }
  }

  // ==========================================================================
  // CATEGORY H: Closure Readiness
  // ==========================================================================
  if (runAll || type === 'closure') {
    if (matter.status === 'Closed' || matter.status === 'Archived') {
      items.push({
        category: 'closure',
        label: `Matter is already ${matter.status.toLowerCase()}`,
        status: 'passed',
        severity: 'info',
        source_type: 'matter_field',
      });
    } else if (matter.status === 'Active' || matter.status === 'Discovery') {
      items.push({
        category: 'closure',
        label: 'Matter is active — closure prerequisites not yet met',
        status: 'warning',
        severity: 'low',
        source_type: 'matter_field',
        recommendation: 'Ensure all tasks, deadlines, and billing items are resolved before closure.',
      });
    } else {
      items.push({
        category: 'closure',
        label: `Matter status: ${matter.status}`,
        status: 'passed',
        severity: 'info',
        source_type: 'matter_field',
      });
    }
  }

  // ==========================================================================
  // Calculate score and status
  // ==========================================================================
  const { score, status } = deriveScoreAndStatus(items);
  const checkId = crypto.randomUUID();
  const checkedAt = new Date().toISOString();

  // ==========================================================================
  // Persist matter_readiness_checks row
  // ==========================================================================
  const { error: checkInsertErr } = await adminDb
    .from('matter_readiness_checks')
    .insert({
      id: checkId,
      firm_id: auth.firmId,
      matter_id: parsed.matter_id,
      readiness_type: parsed.readiness_type,
      score,
      status,
      advisory_note: ADVISORY_NOTE,
      checked_by: auth.userId,
      checked_at: checkedAt,
    });

  if (checkInsertErr) {
    throw new Error(`Failed to store readiness check: ${checkInsertErr.message}`);
  }

  // ==========================================================================
  // Persist matter_readiness_items rows
  // ==========================================================================
  if (items.length > 0) {
    const itemRows = items.map((item) => ({
      firm_id: auth.firmId,
      matter_id: parsed.matter_id,
      readiness_check_id: checkId,
      category: item.category,
      label: item.label,
      status: item.status,
      severity: item.severity,
      source_type: item.source_type ?? null,
      source_ref_id: item.source_ref_id ?? null,
      recommendation: item.recommendation ?? null,
    }));

    const { error: itemsInsertErr } = await adminDb
      .from('matter_readiness_items')
      .insert(itemRows);

    if (itemsInsertErr) {
      throw new Error(`Failed to store readiness items: ${itemsInsertErr.message}`);
    }
  }

  // ==========================================================================
  // Audit log
  // ==========================================================================
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'RUN_MATTER_READINESS_CHECK',
    resource_type: 'matter_readiness_checks',
    resource_id: checkId,
    changes: {
      matter_id: parsed.matter_id,
      readiness_type: parsed.readiness_type,
      score,
      status,
      item_count: items.length,
    },
  });

  revalidatePath(`/dashboard/matters/${parsed.matter_id}`);

  return {
    check_id: checkId,
    matter_id: parsed.matter_id,
    firm_id: auth.firmId,
    readiness_type: parsed.readiness_type,
    score,
    status,
    advisory_note: ADVISORY_NOTE,
    items,
    checked_at: checkedAt,
  };
}

// ===========================================================================
// getMatterReadinessChecks
// Returns all past readiness check summaries for a matter (newest first).
// ===========================================================================
export async function getMatterReadinessChecks(matterId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Firm-scope gate
  const { data: matter, error: matErr } = await adminDb
    .from('matters')
    .select('id')
    .eq('id', matterId)
    .eq('firm_id', auth.firmId)
    .single();

  if (matErr || !matter) {
    throw new Error('Access denied: Matter not found or belongs to another firm.');
  }

  const { data, error } = await adminDb
    .from('matter_readiness_checks')
    .select('id, readiness_type, score, status, advisory_note, checked_at, checked_by')
    .eq('matter_id', matterId)
    .eq('firm_id', auth.firmId)
    .order('checked_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// ===========================================================================
// getLatestMatterReadinessCheck
// Returns the most recent readiness check summary for a matter.
// ===========================================================================
export async function getLatestMatterReadinessCheck(matterId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Firm-scope gate
  const { data: matter, error: matErr } = await adminDb
    .from('matters')
    .select('id')
    .eq('id', matterId)
    .eq('firm_id', auth.firmId)
    .single();

  if (matErr || !matter) {
    throw new Error('Access denied: Matter not found or belongs to another firm.');
  }

  const { data, error } = await adminDb
    .from('matter_readiness_checks')
    .select('id, readiness_type, score, status, advisory_note, checked_at, checked_by')
    .eq('matter_id', matterId)
    .eq('firm_id', auth.firmId)
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

// ===========================================================================
// getMatterReadinessItems
// Returns all readiness items for a specific check, firm-scoped.
// ===========================================================================
export async function getMatterReadinessItems(readinessCheckId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('matter_readiness_items')
    .select('id, category, label, status, severity, source_type, source_ref_id, recommendation')
    .eq('readiness_check_id', readinessCheckId)
    .eq('firm_id', auth.firmId)
    .order('severity', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}
